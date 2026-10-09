using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

namespace HuroofAlKora;

/// <summary>Native, offline-first launch experience. No remote pictures, fonts or scripts.</summary>
internal sealed class SplashView : UserControl
{
    private readonly Timer pulse;
    private readonly Button retry;
    private readonly Button online;
    private readonly Button local;
    private readonly PictureBox emblem;
    private readonly Label statusLabel;
    private int frame;
    private bool failed;
    public event EventHandler? RetryRequested;
    public event EventHandler? OnlineRequested;
    public event EventHandler? LocalRequested;

    public SplashView()
    {
        Dock = DockStyle.Fill;
        BackColor = Color.FromArgb(9, 17, 33);
        DoubleBuffered = true;
        ResizeRedraw = true;
        Font = new Font("Segoe UI", 10f);
        emblem = new PictureBox { SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Transparent, Size = new Size(120, 120) };
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("HuroofAlKora.Assets.HuroofAlKora-master.png"))
            if (stream != null) { using var loaded = Image.FromStream(stream); emblem.Image = new Bitmap(loaded); }
        statusLabel = new Label
        {
            Text = "نجهّز الملعب لك...", ForeColor = Color.FromArgb(168, 190, 205),
            BackColor = Color.Transparent, AutoSize = false, TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 11f), Height = 72
        };
        local = MakeButton("اللعب المحلي السريع", Color.FromArgb(27, 195, 131));
        online = MakeButton("اللعب الجماعي أونلاين", Color.FromArgb(29, 48, 76));
        retry = MakeButton("إعادة المحاولة", Color.FromArgb(27, 195, 131));
        retry.Visible = false;
        local.Click += (_, _) => LocalRequested?.Invoke(this, EventArgs.Empty);
        online.Click += (_, _) => OnlineRequested?.Invoke(this, EventArgs.Empty);
        retry.Click += (_, _) => RetryRequested?.Invoke(this, EventArgs.Empty);
        Controls.Add(emblem);
        Controls.Add(statusLabel);
        Controls.Add(local);
        Controls.Add(online);
        Controls.Add(retry);
        Resize += (_, _) => Reflow();
        pulse = new Timer { Interval = 32 };
        pulse.Tick += (_, _) => { frame++; Invalidate(new Rectangle(0, Math.Max(0, Height / 2 - 240), Width, Math.Min(510, Height))); };
        pulse.Start();
        Reflow();
    }

    private static Button MakeButton(string text, Color color)
    {
        var button = new Button {
            Text = text, Size = new Size(208, 47), FlatStyle = FlatStyle.Flat,
            BackColor = color, ForeColor = Color.White, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10f, FontStyle.Bold), TabStop = true
        };
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.MouseOverBackColor = Color.FromArgb(46, 103, 113);
        return button;
    }

    private void Reflow()
    {
        var center = Width / 2;
        var top = Math.Max(35, Height / 2 - 215);
        emblem.Location = new Point(center - 60, top);
        statusLabel.Location = new Point(Math.Max(10, center - 340), top + 231);
        statusLabel.Width = Math.Min(680, Math.Max(250, Width - 20));
        local.Location = new Point(center - 214, top + 325);
        online.Location = new Point(center + 6, top + 325);
        retry.Location = new Point(center - 104, top + 325);
        if (failed) {
            local.Location = new Point(center - 324, top + 325);
            retry.Location = new Point(center - 104, top + 325);
            online.Location = new Point(center + 116, top + 325);
        }
        if (Width < 750) {
            local.Location = new Point(center - 104, top + 300);
            online.Location = new Point(center - 104, top + 352);
            if (failed) retry.Location = new Point(center - 104, top + 404);
        }
        Invalidate();
    }

    public void UpdateStatus(string message, bool error = false, bool working = false)
    {
        statusLabel.Text = message;
        statusLabel.ForeColor = error ? Color.FromArgb(255, 182, 176) : Color.FromArgb(168, 190, 205);
        failed = error;
        retry.Visible = error;
        local.Visible = !working;
        online.Visible = !working;
        Reflow();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        using (var brush = new LinearGradientBrush(ClientRectangle, Color.FromArgb(6, 16, 33), Color.FromArgb(11, 37, 50), 24))
            g.FillRectangle(brush, ClientRectangle);
        using (var glow = new SolidBrush(Color.FromArgb(22, 24, 213, 148)))
            g.FillEllipse(glow, Width / 2 - 320, Height / 2 - 310, 640, 640);
        using (var glow2 = new SolidBrush(Color.FromArgb(16, 67, 132, 253)))
            g.FillEllipse(glow2, Width / 2 - 230, Height / 2 - 280, 460, 460);
        using (var field = new Pen(Color.FromArgb(18, 185, 211, 203), 1.5f))
        {
            var cx = Width / 2;
            var cy = Height / 2;
            g.DrawEllipse(field, cx - 290, cy - 300, 580, 580);
            g.DrawEllipse(field, cx - 185, cy - 200, 370, 370);
        }
        var y = Math.Max(35, Height / 2 - 215) + 132;
        using var titleFont = new Font("Segoe UI", 31, FontStyle.Bold, GraphicsUnit.Point);
        using var subtitleFont = new Font("Segoe UI", 11, FontStyle.Regular, GraphicsUnit.Point);
        using var footerFont = new Font("Segoe UI", 9, FontStyle.Regular, GraphicsUnit.Point);
        using var titleBrush = new SolidBrush(Color.FromArgb(239, 249, 250));
        using var mutedBrush = new SolidBrush(Color.FromArgb(131, 164, 183));
        var centered = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center, FormatFlags = StringFormatFlags.DirectionRightToLeft };
        g.DrawString("حروف الكورة", titleFont, titleBrush, new RectangleF(0, y, Width, 69), centered);
        centered.FormatFlags = 0;
        g.DrawString("HUROOF ALKORA  •  WINDOWS EDITION", subtitleFont, mutedBrush, new RectangleF(0, y + 68, Width, 32), centered);
        if (!failed)
        {
            int lineW = Math.Min(290, Width - 80);
            int lineX = (Width - lineW) / 2;
            int lineY = y + 154;
            using var track = new SolidBrush(Color.FromArgb(35, 65, 85));
            using var progress = new SolidBrush(Color.FromArgb(31, 218, 150));
            g.FillRectangle(track, lineX, lineY, lineW, 4);
            int offset = (frame * 4) % (lineW + 90) - 90;
            var x1 = Math.Max(0, offset);
            var x2 = Math.Min(lineW, offset + 90);
            if (x2 > x1) g.FillRectangle(progress, lineX + x1, lineY, x2 - x1, 4);
        }
        g.DrawString("تجربة كروية عربية  •  بدون صلاحيات مسؤول  •  بياناتك على جهازك", footerFont, mutedBrush,
            new RectangleF(10, Height - 66, Math.Max(50, Width - 20), 40), centered);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) {
            pulse.Stop(); pulse.Dispose(); emblem.Image?.Dispose();
        }
        base.Dispose(disposing);
    }
}
