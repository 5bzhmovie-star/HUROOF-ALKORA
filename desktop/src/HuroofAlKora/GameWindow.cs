using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Linq;
using System.Text.Json;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace HuroofAlKora;

/// <summary>Desktop shell has no administrative privileges or privileged JavaScript bridge.</summary>
internal sealed class GameWindow : Form
{
    // No dependency on any hosted website. Remote play targets only a server the user configures.
    private readonly WebView2 browser;
    private readonly SplashView splash;
    private readonly SemaphoreSlim initializeGate = new(1, 1);
    private Process? backend;
    private string localUrl = "";
    private string gameUrl = "";
    private bool onlineMode;
    private bool lanMode;
    private string? lanIp;
    private Uri? remoteOrigin;
    private bool webviewReady;
    private bool shuttingDown;
    private bool fullScreen;
    private readonly LaunchTransition launch = new();
    private readonly System.Windows.Forms.Timer revealTimer;
    private ulong navigationId;
    private FormWindowState savedWindowState;
    private Rectangle savedBounds;

    public GameWindow()
    {
        Text = "حروف الكورة";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(640, 480);
        Size = new Size(1350, 855);
        BackColor = Color.FromArgb(16, 32, 31);
        FormBorderStyle = FormBorderStyle.None;
        // Set the final display bounds before the first paint; no window/title-bar flash.
        var screen = Screen.FromPoint(Cursor.Position);
        var area = screen.WorkingArea;
        var width = Math.Min(1350, Math.Max(640, area.Width - 64));
        var height = Math.Min(855, Math.Max(480, area.Height - 64));
        savedBounds = new Rectangle(area.Left+(area.Width-width)/2,area.Top+(area.Height-height)/2,width,height);
        savedWindowState = FormWindowState.Normal;
        StartPosition = FormStartPosition.Manual;
        Bounds = screen.Bounds; fullScreen = true;
        KeyPreview = true;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { /* optional icon */ }

        browser = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(16, 32, 31) };

        splash = new SplashView();
        splash.RetryRequested += async (_, _) => await InitializeModeAsync();
        splash.OnlineRequested += async (_, _) => await SetModeAsync(true);
        splash.LocalRequested += async (_, _) => await SetModeAsync(false);
        Controls.Add(browser);
        Controls.Add(splash);
        splash.BringToFront();
        revealTimer = new System.Windows.Forms.Timer { Interval = 32 };
        revealTimer.Tick += (_, _) => {
            if (shuttingDown || IsDisposed) { revealTimer.Stop(); return; }
            if (launch.TryComplete(DateTimeOffset.UtcNow)) {
                revealTimer.Stop(); splash.Hide(); browser.Focus();
            } else if (launch.HasTimedOut(DateTimeOffset.UtcNow)) {
                revealTimer.Stop(); launch.Fail(navigationId);
                splash.UpdateStatus("تأخر تجهيز اللعبة. أعد المحاولة.", error: true);
            }
        };
        Shown += async (_, _) => await InitializeModeAsync();
        FormClosed += (_, _) => { shuttingDown = true; revealTimer.Stop(); revealTimer.Dispose(); StopBackend(); };
        KeyDown += (_, e) => {
            if (e.KeyCode == Keys.F11 || (e.Alt && e.KeyCode == Keys.Enter)) { ToggleFullScreen(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape && fullScreen) { ToggleFullScreen(); e.Handled = true; }
            else if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R)) { Reload(); e.Handled = true; }
            else if (e.KeyCode == Keys.F1) { ShowAbout(); e.Handled = true; }
        };
    }

    private static int FreeLoopbackPort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private async Task StartLocalBackendAsync()
    {
        if (backend is { HasExited: false }) return;
        var gameRoot = Path.Combine(AppContext.BaseDirectory, "game");
        var nodeExe = Path.Combine(gameRoot, "runtime", "node.exe");
        var serverEntry = Path.Combine(gameRoot, "server", "index.mjs");
        var frontend = Path.Combine(gameRoot, "dist", "client", "index.html");
        var questions = Path.Combine(gameRoot, "seed", "questions.json");
        if (!File.Exists(nodeExe) || !File.Exists(serverEntry) || !File.Exists(frontend) || !File.Exists(questions))
            throw new FileNotFoundException("ملفات اللعبة المحلية غير مكتملة. شغّل النسخة المبنية كاملةً، ولا تفصل EXE عن مجلد game.");
        var profileRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HuroofAlKora");
        var dataDir = Path.Combine(profileRoot, "data");
        Directory.CreateDirectory(dataDir);
        var port = FreeLoopbackPort();
        var healthToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        localUrl = $"http://127.0.0.1:{port}/";
        var start = new ProcessStartInfo(nodeExe) {
            WorkingDirectory = gameRoot, UseShellExecute = false, CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        // Defense in depth: allow Node to read only bundled game and private user data,
        // write only inside the private data folder, and deny child processes/inspector.
        // Node's permission model is not an OS sandbox or a defense against malicious native code.
        start.ArgumentList.Add("--permission");
        start.ArgumentList.Add("--allow-fs-read=" + gameRoot);
        start.ArgumentList.Add("--allow-fs-read=" + dataDir);
        start.ArgumentList.Add("--allow-fs-write=" + dataDir);
        start.ArgumentList.Add(serverEntry);
        start.Environment["PORT"] = port.ToString();
        start.Environment["HOST"] = lanMode ? "0.0.0.0" : "127.0.0.1"; // LAN requires explicit user action.
        if (lanMode && lanIp != null) start.Environment["HK_DESKTOP_LAN_IP"] = lanIp;
        else start.Environment.Remove("HK_DESKTOP_LAN_IP");
        start.Environment["APP_ORIGIN"] = localUrl;
        start.Environment["DATA_DIR"] = dataDir;
        start.Environment["NODE_ENV"] = "desktop";
        start.Environment["HK_DESKTOP_HEALTH_TOKEN"] = healthToken;
        start.Environment.Remove("TRUSTED_PROXY_IP"); // reject untrusted forwarded IPs
        start.Environment.Remove("NODE_OPTIONS"); // untrusted env must not inject --require/--import
        start.Environment.Remove("NODE_PATH");
        start.Environment.Remove("TURNSTILE_SECRET_KEY");
        start.Environment.Remove("TURNSTILE_SITE_KEY");
        if (shuttingDown) return;
        backend = Process.Start(start) ?? throw new InvalidOperationException("تعذّر تشغيل خادم اللعبة المحلي.");
        if (shuttingDown) { StopBackend(); return; }
        using var http = new HttpClient { Timeout = TimeSpan.FromMilliseconds(850) };
        http.DefaultRequestHeaders.TryAddWithoutValidation("X-Desktop-Health", healthToken);
        for (var i = 0; i < 90; i++) {
            if (shuttingDown) { StopBackend(); return; }
            if (backend.HasExited) throw new InvalidOperationException("توقف محرك اللعبة المحلي أثناء التشغيل.");
            try {
                using var response = await http.GetAsync(localUrl + "api/health");
                if (response.IsSuccessStatusCode) return;
            } catch (HttpRequestException) { } catch (TaskCanceledException) { }
            await Task.Delay(120);
        }
        throw new TimeoutException("تعذّر بدء خادم اللعبة. تأكد من اكتمال ملفات الإصدار.");
    }

    private static string? DiscoverPrivateIPv4()
    {
        foreach(var adapter in NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up
                 && n.NetworkInterfaceType != NetworkInterfaceType.Loopback
                 && n.NetworkInterfaceType != NetworkInterfaceType.Tunnel))
        {
            foreach(var entry in adapter.GetIPProperties().UnicastAddresses)
            {
                if(entry.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                var b=entry.Address.GetAddressBytes();
                if(b[0]==10 || b[0]==192&&b[1]==168 || b[0]==172&&b[1]>=16&&b[1]<=31)
                    return entry.Address.ToString();
            }
        }
        return null;
    }

    private async Task SetLanModeAsync()
    {
        if (initializeGate.CurrentCount == 0) return;
        var ip = DiscoverPrivateIPv4();
        if(ip == null)
        {
            MessageBox.Show("لم أجد عنوان شبكة محلية خاصة. اتصل بشبكة Wi-Fi أو Ethernet أولًا.",
                "الشبكة المحلية", MessageBoxButtons.OK, MessageBoxIcon.Warning); return;
        }
        if (lanMode && !onlineMode) return;
        var result = MessageBox.Show(
            "سيصبح خادم اللعبة متاحًا لأجهزة شبكتك المحلية عند سماح جدار حماية Windows بالاتصال.\n" +
            "هذا لا يفتح اللعبة عبر الإنترنت، ولا يطلب التطبيق التشغيل كمسؤول.\n" +
            "قد تتوقف روابط الجرس السابقة عند تغيير وضع الخادم.\n\n" +
            $"العنوان المحلي الذي سيظهر في روابط اللاعبين: {ip}\n\nهل تود التفعيل؟",
            "تفعيل الشبكة المحلية", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
        if(result != DialogResult.Yes) return;
        lanIp = ip; lanMode = true; onlineMode = false; StopBackend();
        await InitializeModeAsync();
    }

    private static Uri? AskRemoteServer(IWin32Window owner, Uri? last)
    {
        using var dialog=new Form { Text="اتصال بالخادم الجماعي", Size=new Size(570,255),
            StartPosition=FormStartPosition.CenterParent, FormBorderStyle=FormBorderStyle.FixedDialog,
            MaximizeBox=false, MinimizeBox=false, BackColor=Color.FromArgb(16,32,31),
            ForeColor=Color.White, RightToLeft=RightToLeft.Yes, RightToLeftLayout=true };
        var label=new Label { Text="أدخل عنوان خادم حروف الكورة المستقل (HTTPS)\nلا يستخدم هذا الوضع موقع ChatGPT Sites القديم.",
            Location=new Point(20,20),Size=new Size(515,54) };
        var input=new TextBox { Text=last?.GetLeftPart(UriPartial.Authority) ?? "https://", Location=new Point(20,93),
            Size=new Size(515,31),RightToLeft=RightToLeft.No };
        var ok=new Button { Text="اتصال", Location=new Point(370,145),Size=new Size(164,36),
            DialogResult=DialogResult.OK,BackColor=Color.FromArgb(194,241,124),ForeColor=Color.FromArgb(22,51,41) };
        var cancel=new Button { Text="إلغاء",Location=new Point(190,145),Size=new Size(164,36),
            DialogResult=DialogResult.Cancel };
        dialog.Controls.AddRange(new Control[]{label,input,ok,cancel});dialog.AcceptButton=ok;dialog.CancelButton=cancel;
        if(dialog.ShowDialog(owner)!=DialogResult.OK) return null;
        if(!Uri.TryCreate(input.Text.Trim(),UriKind.Absolute,out var url)
             || url.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(url.UserInfo)
             || !string.IsNullOrEmpty(url.Query) || !string.IsNullOrEmpty(url.Fragment))
        {
            MessageBox.Show("يلزم عنوان HTTPS صحيح من خادم موثوق، دون بيانات دخول داخل الرابط.",
                "عنوان الخادم غير صالح",MessageBoxButtons.OK,MessageBoxIcon.Warning);
            return null;
        }
        return new Uri(url.GetLeftPart(UriPartial.Authority)+"/");
    }

    private async Task SetModeAsync(bool online)
    {
        if (shuttingDown || IsDisposed || initializeGate.CurrentCount == 0) return;
        if (online)
        {
            var next=AskRemoteServer(this,remoteOrigin);
            if (next == null) return;
            remoteOrigin=next; onlineMode=true;
        }
        else
        {
            if(!onlineMode && !lanMode && browser.CoreWebView2 is not null && !splash.Visible) return;
            onlineMode=false;lanMode=false;lanIp=null;StopBackend();
        }
        await InitializeModeAsync();
    }

    private async Task OpenAdminAsync()
    {
        if(shuttingDown || IsDisposed || initializeGate.CurrentCount == 0) return;
        if (!onlineMode)
        {
            if(backend is not {HasExited:false}) await StartLocalBackendAsync();
            var root=Path.Combine(AppContext.BaseDirectory,"game");
            var data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "HuroofAlKora","data");
            try
            {
                if(!await AdminEnrollment.HasOwnerAsync(root,data) && !AdminEnrollment.ShowDialog(this,root,data))
                    return;
            }
            catch(Exception ex)
            {
                MessageBox.Show("تعذر إعداد الإدارة: "+ex.Message,"لوحة الإدارة",
                    MessageBoxButtons.OK,MessageBoxIcon.Error);return;
            }
        }
        if (browser.CoreWebView2 == null) await PrepareBrowserAsync();
        if (browser.CoreWebView2 == null) return;
        gameUrl = onlineMode ? remoteOrigin!.AbsoluteUri : localUrl;
        browser.CoreWebView2.Navigate(gameUrl + "admin");
    }

    private async Task InitializeModeAsync()
    {
        if (!await initializeGate.WaitAsync(0)) return; // ignore repeated launch clicks
        try {
            if (shuttingDown || IsDisposed) return;
            splash.Show(); splash.BringToFront();
            splash.UpdateStatus(onlineMode ? "جارٍ الاتصال بالخادم المحدد..." : lanMode ? "جارٍ بدء استضافة الشبكة المحلية..." : "جارٍ تشغيل المحرك المحلي...", working: true);
            if (onlineMode) gameUrl = remoteOrigin?.AbsoluteUri ?? throw new InvalidOperationException("عنوان الخادم الجماعي غير محدد.");
            else {
                await StartLocalBackendAsync();
                gameUrl = localUrl;
            }
            splash.UpdateStatus("جارٍ تجهيز نافذة اللعبة الآمنة...", working: true);
            if (!webviewReady) await PrepareBrowserAsync();
            if (shuttingDown || IsDisposed || browser.CoreWebView2 == null) return;
            browser.CoreWebView2.Navigate(gameUrl);
        }
        catch (Exception ex) {
            if (!onlineMode && !webviewReady) StopBackend();
            if (!shuttingDown && !IsDisposed)
                splash.UpdateStatus("تعذّر تشغيل اللعبة. " + ex.Message, error: true);
        }
        finally { initializeGate.Release(); }
    }

    private async Task PrepareBrowserAsync()
    {
        var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HuroofAlKora", "BrowserProfile");
        Directory.CreateDirectory(profile);
        var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
        await browser.EnsureCoreWebView2Async(environment);
        if (shuttingDown || browser.CoreWebView2 == null) return;
        var core = browser.CoreWebView2;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = false;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false;
        core.Settings.AreHostObjectsAllowed = false; // no arbitrary COM/native APIs exposed to site code
        core.Settings.IsWebMessageEnabled = true; // allowlisted window UI commands only
        core.PermissionRequested += (_, args) => { args.State = CoreWebView2PermissionState.Deny; };
        core.DownloadStarting += (_, args) => {
            // The native app never downloads silently. Admin export requires an explicit Save dialog.
            if (!AllowedInGame(core.Source) || !Uri.TryCreate(core.Source, UriKind.Absolute, out var page)
                || page.AbsolutePath != "/admin") { args.Cancel = true; return; }
            using var save = new SaveFileDialog {
                Title = "حفظ تصدير حروف الكورة",
                Filter = "ملفات JSON (*.json)|*.json|كل الملفات (*.*)|*.*",
                FileName = "huroof-questions.json",
                OverwritePrompt = true
            };
            if (save.ShowDialog(this) == DialogResult.OK) args.ResultFilePath = save.FileName;
            else args.Cancel = true;
        };
        core.WebMessageReceived += (_, args) => {
            if (shuttingDown || IsDisposed || !AllowedInGame(args.Source)) return;
            string action;
            try { action = args.TryGetWebMessageAsString(); } catch { return; }
            if (action.StartsWith("{",StringComparison.Ordinal)) {
                try {
                    using var message = JsonDocument.Parse(action);
                    if (message.RootElement.GetProperty("action").GetString() == "ready"
                        && ulong.TryParse(message.RootElement.GetProperty("navigation").GetString(),out var id)) launch.AppReady(id);
                } catch (Exception ex) when (ex is JsonException or InvalidOperationException or KeyNotFoundException) { }
                return;
            }
            switch(action) {
                case "fullscreen": BeginInvoke((MethodInvoker)ToggleFullScreen); break;
                case "reload": BeginInvoke((MethodInvoker)Reload); break;
                case "escape" when fullScreen: BeginInvoke((MethodInvoker)ToggleFullScreen); break;
                case "move" when !fullScreen: BeginInvoke((MethodInvoker)MoveWindow); break;
                case "minimize": BeginInvoke((MethodInvoker)(() => WindowState = FormWindowState.Minimized)); break;
                case "close": BeginInvoke((MethodInvoker)Close); break;
                case "about": BeginInvoke((MethodInvoker)ShowAbout); break;
                case "admin": BeginInvoke((MethodInvoker)(async () => await OpenAdminAsync())); break;
                case "lan": BeginInvoke((MethodInvoker)(async () => await SetLanModeAsync())); break;
                case "local": BeginInvoke((MethodInvoker)(async () => await SetModeAsync(false))); break;
                case "online": BeginInvoke((MethodInvoker)(async () => await SetModeAsync(true))); break;
            }
        };
        using (var script = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream("HuroofAlKora.DesktopPage.js")
            ?? throw new InvalidOperationException("ملف واجهة المشغل غير موجود."))
        using (var reader = new StreamReader(script))
            await core.AddScriptToExecuteOnDocumentCreatedAsync(await reader.ReadToEndAsync());
        core.NavigationStarting += (_, args) => {
            // A redirect must not open an arbitrary site or native shell operation.
            if (!AllowedInGame(args.Uri)) { args.Cancel = true; return; }
            navigationId = args.NavigationId;
            launch.Begin(navigationId, DateTimeOffset.UtcNow);
            splash.Show(); splash.BringToFront();
            splash.UpdateStatus("جارٍ تجهيز الملعب…", working: true);
            revealTimer.Start();
        };
        core.NewWindowRequested += (_, args) => {
            args.Handled = true;
            if (args.IsUserInitiated) OpenOutside(args.Uri); // user gesture only, HTTPS only
        };
        core.NavigationCompleted += async (_, args) => {
            if (shuttingDown || IsDisposed || args.NavigationId != navigationId) return;
            if (args.IsSuccess) {
                launch.DocumentLoaded(args.NavigationId);
                var shareOrigin = lanMode && !onlineMode && lanIp != null
                    ? $"http://{lanIp}:{new Uri(localUrl).Port}" : "";
                try {
                    await core.ExecuteScriptAsync("window.__HK_LAN_SHARE_ORIGIN = "
                        + JsonSerializer.Serialize(shareOrigin) + "; window.__hkDesktopReady?.("
                        + JsonSerializer.Serialize(args.NavigationId.ToString(System.Globalization.CultureInfo.InvariantCulture)) + ");");
                } catch (Exception ex) when (ex is InvalidOperationException or System.Runtime.InteropServices.COMException) {
                    if (!shuttingDown && !IsDisposed && args.NavigationId == navigationId) {
                        revealTimer.Stop(); launch.Fail(args.NavigationId);
                        splash.UpdateStatus("تعذّر تجهيز عرض اللعبة. أعد المحاولة.", error: true);
                    }
                }
            } else {
                revealTimer.Stop(); launch.Fail(args.NavigationId);
                splash.UpdateStatus("تعذّر عرض اللعبة. تحقق من الاتصال، ثم حاول مرة أخرى.", error: true);
            }
        };
        webviewReady = true;
    }

    private bool AllowedInGame(string? candidate)
    {
        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) return false;
        if (onlineMode) return remoteOrigin != null && uri.Scheme == Uri.UriSchemeHttps
            && uri.GetLeftPart(UriPartial.Authority).Equals(remoteOrigin.GetLeftPart(UriPartial.Authority),StringComparison.OrdinalIgnoreCase);
        return Uri.TryCreate(localUrl, UriKind.Absolute, out var local)
            && uri.Scheme == Uri.UriSchemeHttp && uri.Host == "127.0.0.1" && uri.Port == local.Port;
    }

    private static void OpenOutside(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) return;
        try { Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true }); } catch { /* no native bridge */ }
    }

    private void Reload() {
        if (!IsDisposed && browser.CoreWebView2 is not null && gameUrl.Length > 0)
            browser.CoreWebView2.Navigate(gameUrl);
    }

    private static void ShowAbout() => MessageBox.Show(
        "حروف الكورة | Windows Edition v2.3.0\n\n" +
        "محلي: لعبة وخادم داخل جهازك دون صلاحيات المسؤول.\n" +
        "خادم جماعي: اتصال مباشر بخادم حروف الكورة مستقل يحدده المستخدم.\n" +
        "شبكة LAN: غرف مباشرة لأجهزة الشبكة نفسها.\n\n" +
        "F11: ملء الشاشة  ·  F5: تحديث\n\n" +
        "حماية: دون ملفات إدارية أو وصول للنظام من صفحة اللعبة.\n" +
        "المباريات المحلية غير معتمدة كإحصاءات مركزية.\n\n" +
        "يزن عبدالعزيز — Discord: k6a", "حول حروف الكورة", MessageBoxButtons.OK, MessageBoxIcon.Information);

    private void ToggleFullScreen()
    {
        if (!fullScreen) {
            savedWindowState = WindowState; savedBounds = Bounds;
            WindowState = FormWindowState.Normal; FormBorderStyle = FormBorderStyle.None;
            Bounds = Screen.FromControl(this).Bounds; fullScreen = true;
        } else {
            FormBorderStyle = FormBorderStyle.None; Bounds = savedBounds; WindowState = savedWindowState;
            fullScreen = false;
        }
    }

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern bool ReleaseCapture();
    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr handle, uint message, IntPtr wParam, IntPtr lParam);
    private void MoveWindow()
    {
        if (fullScreen || shuttingDown || IsDisposed) return;
        ReleaseCapture(); SendMessage(Handle, 0x00A1, new IntPtr(2), IntPtr.Zero);
    }

    private void StopBackend()
    {
        try { if (backend is { HasExited: false }) backend.Kill(entireProcessTree: true); } catch { }
        try { backend?.Dispose(); } catch { }
        backend = null;
    }
}
