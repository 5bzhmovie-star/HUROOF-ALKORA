using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
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
    private const string PublicGameOrigin = "https://huroof-alkora.yaznabdulaziz1.chatgpt.site";
    private readonly WebView2 browser;
    private readonly SplashView splash;
    private readonly Panel toolbar;
    private readonly Button localButton;
    private readonly Button onlineButton;
    private readonly SemaphoreSlim initializeGate = new(1, 1);
    private Process? backend;
    private string localUrl = "";
    private string gameUrl = "";
    private bool onlineMode;
    private bool webviewReady;
    private bool shuttingDown;
    private bool fullScreen;
    private FormBorderStyle savedBorder;
    private FormWindowState savedWindowState;
    private Rectangle savedBounds;

    public GameWindow()
    {
        Text = "حروف الكورة | HUROOF ALKORA";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(850, 560);
        Size = new Size(1350, 855);
        BackColor = Color.FromArgb(16, 32, 31);
        KeyPreview = true;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { /* optional icon */ }

        browser = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(16, 32, 31) };
        toolbar = new Panel { Dock = DockStyle.Top, Height = 53, BackColor = Color.FromArgb(16, 32, 31) };
        var brandIcon = new PictureBox { Location = new Point(15, 7), Size = new Size(38, 38), SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent };
        using (var brandResource = Assembly.GetExecutingAssembly().GetManifestResourceStream("HuroofAlKora.Assets.HuroofAlKora-master.png"))
        {
            if (brandResource != null) { using var img = Image.FromStream(brandResource); brandIcon.Image = new Bitmap(img); }
        }
        var bottomBorder = new Panel { Dock = DockStyle.Bottom, Height = 1, BackColor = Color.FromArgb(43, 69, 64) };
        var caption = new Label { Text = "حروف الكورة  ·  WINDOWS EDITION", AutoSize = false,
            TextAlign = ContentAlignment.MiddleLeft, ForeColor = Color.FromArgb(237, 243, 234),
            Font = new Font("Segoe UI", 10f, FontStyle.Bold), Location = new Point(62, 5), Size = new Size(260, 40) };
        onlineButton = ToolbarButton("أونلاين", new Point(338, 9));
        localButton = ToolbarButton("محلي سريع", new Point(454, 9));
        onlineButton.Click += async (_, _) => await SetModeAsync(true);
        localButton.Click += async (_, _) => await SetModeAsync(false);
        var hint = new Label { Text = "F11  ملء الشاشة   ·   F5  تحديث   ·   F1  معلومات",
            Anchor = AnchorStyles.Top | AnchorStyles.Right, ForeColor = Color.FromArgb(175, 193, 181),
            Font = new Font("Segoe UI", 8.5f), TextAlign = ContentAlignment.MiddleRight,
            Location = new Point(970, 9), Size = new Size(330, 29) };
        toolbar.Resize += (_, _) => hint.Left = Math.Max(540, toolbar.Width - hint.Width - 20);
        toolbar.Controls.AddRange(new Control[] { brandIcon, caption, onlineButton, localButton, hint, bottomBorder });

        splash = new SplashView();
        splash.RetryRequested += async (_, _) => await InitializeModeAsync();
        splash.OnlineRequested += async (_, _) => await SetModeAsync(true);
        splash.LocalRequested += async (_, _) => await SetModeAsync(false);
        Controls.Add(browser);
        Controls.Add(toolbar);
        Controls.Add(splash);
        splash.BringToFront();
        RefreshModeButtons();
        Shown += async (_, _) => await InitializeModeAsync();
        FormClosed += (_, _) => { shuttingDown = true; StopBackend(); };
        KeyDown += (_, e) => {
            if (e.KeyCode == Keys.F11 || (e.Alt && e.KeyCode == Keys.Enter)) { ToggleFullScreen(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape && fullScreen) { ToggleFullScreen(); e.Handled = true; }
            else if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R)) { Reload(); e.Handled = true; }
            else if (e.KeyCode == Keys.F1) { ShowAbout(); e.Handled = true; }
        };
    }

    private static Button ToolbarButton(string title, Point location)
    {
        var button = new Button { Text = title, Location = location, Size = new Size(108, 34),
            BackColor = Color.FromArgb(35, 66, 58), ForeColor = Color.FromArgb(237, 243, 234),
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Font = new Font("Segoe UI", 9f, FontStyle.Bold) };
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = Color.FromArgb(43, 69, 64);
        button.FlatAppearance.MouseOverBackColor = Color.FromArgb(43, 82, 67);
        return button;
    }

    private void RefreshModeButtons()
    {
        localButton.BackColor = !onlineMode ? Color.FromArgb(194, 241, 124) : Color.FromArgb(35, 66, 58);
        localButton.ForeColor = !onlineMode ? Color.FromArgb(22, 51, 41) : Color.FromArgb(237, 243, 234);
        onlineButton.BackColor = onlineMode ? Color.FromArgb(194, 241, 124) : Color.FromArgb(35, 66, 58);
        onlineButton.ForeColor = onlineMode ? Color.FromArgb(22, 51, 41) : Color.FromArgb(237, 243, 234);
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
        start.Environment["HOST"] = "127.0.0.1"; // never expose local server to the LAN
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

    private async Task SetModeAsync(bool online)
    {
        if (shuttingDown || IsDisposed || initializeGate.CurrentCount == 0) return;
        if (online == onlineMode && browser.CoreWebView2 is not null && !splash.Visible) return;
        onlineMode = online;
        RefreshModeButtons();
        await InitializeModeAsync();
    }

    private async Task InitializeModeAsync()
    {
        if (!await initializeGate.WaitAsync(0)) return; // ignore repeated launch clicks
        try {
            if (shuttingDown || IsDisposed) return;
            splash.Show(); splash.BringToFront();
            splash.UpdateStatus(onlineMode ? "جارٍ الاتصال بالموقع الرسمي..." : "جارٍ تشغيل المحرك المحلي...", working: true);
            if (onlineMode) gameUrl = PublicGameOrigin + "/";
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
        core.Settings.IsWebMessageEnabled = true; // restricted to three non-privileged UI shortcuts
        core.PermissionRequested += (_, args) => { args.State = CoreWebView2PermissionState.Deny; };
        core.DownloadStarting += (_, args) => { args.Cancel = true; };
        core.WebMessageReceived += (_, args) => {
            if (!AllowedInGame(args.Source)) return;
            string action;
            try { action = args.TryGetWebMessageAsString(); } catch { return; }
            if (action == "fullscreen") BeginInvoke((MethodInvoker)ToggleFullScreen);
            else if (action == "reload") BeginInvoke((MethodInvoker)Reload);
            else if (action == "escape" && fullScreen) BeginInvoke((MethodInvoker)ToggleFullScreen);
        };
        await core.AddScriptToExecuteOnDocumentCreatedAsync(@"
            document.addEventListener('keydown', function(event) {
              let action = '';
              if (event.key === 'F11' || (event.altKey && event.key === 'Enter')) action = 'fullscreen';
              if (event.key === 'Escape') action = 'escape';
              if (event.key === 'F5' || (event.ctrlKey && event.key.toLowerCase() === 'r')) action = 'reload';
              if (action) { event.preventDefault(); window.chrome.webview.postMessage(action); }
            }, true);
        ");
        core.NavigationStarting += (_, args) => {
            // A redirect must not open an arbitrary site or native shell operation.
            if (!AllowedInGame(args.Uri)) args.Cancel = true;
        };
        core.NewWindowRequested += (_, args) => {
            args.Handled = true;
            if (args.IsUserInitiated) OpenOutside(args.Uri); // user gesture only, HTTPS only
        };
        core.NavigationCompleted += (_, args) => {
            if (shuttingDown || IsDisposed) return;
            if (args.IsSuccess) {
                splash.Hide();
                browser.Focus();
            } else splash.UpdateStatus("تعذّر عرض اللعبة. تحقق من الاتصال، ثم حاول مرة أخرى.", error: true);
        };
        webviewReady = true;
    }

    private bool AllowedInGame(string? candidate)
    {
        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) return false;
        if (onlineMode) return uri.Scheme == Uri.UriSchemeHttps && uri.Host.Equals("huroof-alkora.yaznabdulaziz1.chatgpt.site", StringComparison.OrdinalIgnoreCase) && uri.IsDefaultPort;
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
        "حروف الكورة | Windows Edition v1.2.1\n\n" +
        "محلي: لعبة وخادم داخل جهازك دون صلاحيات المسؤول.\n" +
        "أونلاين: الغرف والجرس عبر الموقع الرسمي، وتتطلب الإنترنت.\n\n" +
        "F11: ملء الشاشة  ·  F5: تحديث\n\n" +
        "حماية: دون ملفات إدارية أو وصول للنظام من صفحة اللعبة.\n" +
        "المباريات المحلية غير معتمدة كإحصاءات مركزية.\n\n" +
        "يزن عبدالعزيز — Discord: k6a", "حول حروف الكورة", MessageBoxButtons.OK, MessageBoxIcon.Information);

    private void ToggleFullScreen()
    {
        if (!fullScreen) {
            savedBorder = FormBorderStyle; savedWindowState = WindowState; savedBounds = Bounds;
            WindowState = FormWindowState.Normal; FormBorderStyle = FormBorderStyle.None;
            Bounds = Screen.FromControl(this).Bounds; toolbar.Hide(); fullScreen = true;
        } else {
            FormBorderStyle = savedBorder; Bounds = savedBounds; WindowState = savedWindowState;
            toolbar.Show(); fullScreen = false;
        }
    }

    private void StopBackend()
    {
        try { if (backend is { HasExited: false }) backend.Kill(entireProcessTree: true); } catch { }
        try { backend?.Dispose(); } catch { }
        backend = null;
    }
}
