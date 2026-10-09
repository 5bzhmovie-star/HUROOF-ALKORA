using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HuroofAlKora;

/// <summary>First-run owner enrollment. All secrets pass only over private child process pipes, never HTTP.</summary>
internal static class AdminEnrollment
{
    private static ProcessStartInfo Startup(string gameRoot, string dataDir, bool status)
    {
        var start = new ProcessStartInfo(Path.Combine(gameRoot, "runtime", "node.exe"))
        {
            WorkingDirectory = gameRoot, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardInput = true, RedirectStandardOutput = true,
            RedirectStandardError = false, WindowStyle = ProcessWindowStyle.Hidden
        };
        start.ArgumentList.Add("--permission");
        start.ArgumentList.Add("--allow-fs-read=" + gameRoot);
        start.ArgumentList.Add("--allow-fs-read=" + dataDir);
        start.ArgumentList.Add("--allow-fs-write=" + dataDir);
        start.ArgumentList.Add(Path.Combine(gameRoot, "server", "bootstrap-admin.mjs"));
        if (status) start.ArgumentList.Add("--status");
        start.Environment["DATA_DIR"] = dataDir;
        start.Environment.Remove("NODE_OPTIONS");
        start.Environment.Remove("NODE_PATH");
        return start;
    }

    private static async Task<JsonElement> NextAsync(Process child, object? input)
    {
        if (input != null)
        {
            await child.StandardInput.WriteLineAsync(JsonSerializer.Serialize(input));
            await child.StandardInput.FlushAsync();
        }
        var line = await child.StandardOutput.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(35));
        if (string.IsNullOrWhiteSpace(line))
            throw new InvalidOperationException("توقف إعداد الإدارة قبل الاكتمال.");
        return JsonDocument.Parse(line).RootElement.Clone();
    }

    public static async Task<bool> HasOwnerAsync(string gameRoot, string dataDir)
    {
        using var child = Process.Start(Startup(gameRoot, dataDir, true))
            ?? throw new InvalidOperationException("تعذّر تشغيل إعداد الإدارة.");
        var result = await NextAsync(child, null);
        await child.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(12));
        if (child.ExitCode != 0)
            throw new InvalidOperationException("تعذّر فحص إعداد الإدارة.");
        return result.TryGetProperty("configured", out var configured) && configured.GetBoolean();
    }

    public static bool ShowDialog(Form owner, string gameRoot, string dataDir)
    {
        using var dialog = new Form
        {
            Text = "إنشاء مالك حروف الكورة",
            StartPosition = FormStartPosition.CenterParent,
            Size = new Size(585, 540),
            MinimumSize = new Size(585, 540),
            MaximumSize = new Size(585, 540),
            RightToLeft = RightToLeft.Yes,
            RightToLeftLayout = true,
            BackColor = Color.FromArgb(16,32,31),
            ForeColor = Color.FromArgb(237,243,234),
            Font = new Font("Segoe UI",10f),
            FormBorderStyle = FormBorderStyle.FixedDialog,
            MaximizeBox = false,
            MinimizeBox = false
        };
        var intro = new Label
        {
            Text = "إنشاء حساب الإدارة لأول مرة\nلن تُخزَّن كلمة المرور بصيغة مكشوفة، وسيُطلب رمز المصادقة.",
            Location = new Point(25,20), Size = new Size(525,74),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI",11,FontStyle.Bold)
        };
        var userLabel = Label("اسم المستخدم (بالإنجليزية)", 92);
        var username = Box(122);
        var passwordLabel = Label("كلمة مرور قوية (14 حرفًا فأكثر)", 163);
        var password = Box(193); password.UseSystemPasswordChar = true;
        var secretLabel = Label("مفتاح المصادقة — أضفه إلى تطبيق المصادقة", 163);
        var secret = Box(193); secret.ReadOnly = true; secret.TextAlign = HorizontalAlignment.Center;
        var copy = Button("نسخ المفتاح", 240, 102); copy.Visible = false;
        var codeLabel = Label("رمز المصادقة (6 أرقام)", 300);
        var code = Box(330); code.MaxLength = 6; code.TextAlign = HorizontalAlignment.Center;
        var note = new Label
        {
            Text = "هذه الخطوة ضرورية لحماية لوحة الإدارة.\nاحتفظ بمفتاح المصادقة في مكان آمن.",
            Location = new Point(30, 375), Size = new Size(510,49),
            TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.FromArgb(175,193,181)
        };
        var proceed = Button("متابعة", 433, 167);
        var statusText = new Label
        {
            Location = new Point(25, 476), Size = new Size(525,35),
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.FromArgb(255,182,176)
        };
        dialog.Controls.AddRange(new Control[]{intro,userLabel,username,passwordLabel,password,secretLabel,secret,copy,codeLabel,code,note,proceed,statusText});
        secretLabel.Visible = false; secret.Visible = false; codeLabel.Visible = false; code.Visible = false;
        Process? child = null;
        bool completed = false;
        void Shutdown() { try { if (child is {HasExited:false}) child.Kill(entireProcessTree:true); } catch {} child?.Dispose(); child=null; }
        copy.Click += (_,_) => { if(secret.Text.Length > 0) Clipboard.SetText(secret.Text); };
        proceed.Click += async (_,_) =>
        {
            proceed.Enabled = false; statusText.Text = "";
            try
            {
                if (child == null)
                {
                    if (username.Text.Trim().Length < 3 || password.Text.Length < 14)
                        throw new InvalidOperationException("اسم المستخدم غير صالح أو كلمة المرور أقل من 14 حرفًا.");
                    child = Process.Start(Startup(gameRoot, dataDir, false))
                        ?? throw new InvalidOperationException("تعذّر تشغيل إعداد الإدارة.");
                    var result = await NextAsync(child, new {username = username.Text.Trim(), password = password.Text});
                    password.Clear();
                    if (result.TryGetProperty("error", out var fail)) throw new InvalidOperationException(fail.GetString());
                    secret.Text = result.GetProperty("secret").GetString() ?? "";
                    username.Visible = false; userLabel.Visible = false;
                    password.Visible = false; passwordLabel.Visible = false;
                    secretLabel.Visible = true; secret.Visible = true; copy.Visible = true;
                    codeLabel.Visible = true; code.Visible = true; code.Focus();
                    intro.Text = "أضف مفتاح المصادقة إلى هاتفك\nثم أدخل الرمز المكوّن من 6 أرقام لإكمال الإنشاء.";
                    proceed.Text = "إنشاء حساب المالك";
                }
                else
                {
                    var result = await NextAsync(child, new {code = code.Text.Trim()});
                    if (result.TryGetProperty("error", out var fail))
                        throw new InvalidOperationException(fail.GetString());
                    if (!result.GetProperty("ok").GetBoolean())
                        throw new InvalidOperationException("لم يكتمل إعداد المالك.");
                    completed = true; dialog.DialogResult = DialogResult.OK; dialog.Close();
                }
            }
            catch (Exception ex)
            {
                statusText.Text = ex.Message;
                if (child?.HasExited == true) { Shutdown(); secret.Text=""; proceed.Text="متابعة"; }
            }
            finally { if (!dialog.IsDisposed) proceed.Enabled = true; }
        };
        dialog.FormClosed += (_,_) => Shutdown();
        dialog.ShowDialog(owner);
        return completed;
    }

    private static Label Label(string title,int top) => new()
    {
        Text=title, Location=new Point(30,top), Size=new Size(510,28),
        TextAlign=ContentAlignment.MiddleRight,ForeColor=Color.FromArgb(175,193,181)
    };
    private static TextBox Box(int top) => new()
    {
        Location=new Point(35,top), Size=new Size(500,35),
        BackColor=Color.FromArgb(23,44,42),ForeColor=Color.FromArgb(237,243,234),
        BorderStyle=BorderStyle.FixedSingle
    };
    private static Button Button(string title,int top,int width) => new()
    {
        Text=title,Location=new Point((570-width)/2,top),Size=new Size(width,38),
        FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(194,241,124),
        ForeColor=Color.FromArgb(22,51,41),Cursor=Cursors.Hand
    };
}
