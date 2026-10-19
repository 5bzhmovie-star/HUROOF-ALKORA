using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Reflection;
using System.Runtime.InteropServices;

namespace HuroofAlKora;

/// <summary>Native cover: drawn before WebView starts, with the same Goal mark and Arabic type as the game.</summary>
internal sealed class SplashView : UserControl
{
    private readonly System.Windows.Forms.Timer pulse;
    private readonly Button retry, online, local, close;
    private readonly Label statusLabel;
    private readonly PictureBox emblem;
    private readonly PrivateFontCollection fonts = new();
    private readonly List<IntPtr> fontBuffers = new();
    private int frame;
    private bool failed;
    private readonly Color lime = Color.FromArgb(194,241,124);
    public event EventHandler? RetryRequested;
    public event EventHandler? OnlineRequested;
    public event EventHandler? LocalRequested;

    public SplashView()
    {
        Dock=DockStyle.Fill; BackColor=Color.FromArgb(16,32,31);
        DoubleBuffered=true; ResizeRedraw=true;
        foreach(var name in new[]{"Regular","Bold"})
        {
            using var input=Assembly.GetExecutingAssembly().GetManifestResourceStream($"HuroofAlKora.Assets.Arabic-{name}.ttf");
            if(input==null)continue;
            using var memory=new MemoryStream(); input.CopyTo(memory);var bytes=memory.ToArray();
            var buffer=Marshal.AllocCoTaskMem(bytes.Length);Marshal.Copy(bytes,0,buffer,bytes.Length);
            fonts.AddMemoryFont(buffer,bytes.Length);fontBuffers.Add(buffer);
        }
        Font=new Font("Segoe UI",10f);
        emblem=new PictureBox{SizeMode=PictureBoxSizeMode.Zoom,BackColor=Color.Transparent,Size=new Size(128,128)};
        using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("HuroofAlKora.Assets.HuroofAlKora-master.png"))
            if(stream!=null){using var image=Image.FromStream(stream);emblem.Image=new Bitmap(image);}
        statusLabel=new Label{Text="نجهّز الملعب لك…",ForeColor=Color.FromArgb(175,193,181),BackColor=Color.Transparent,
            AutoSize=false,TextAlign=ContentAlignment.MiddleCenter,RightToLeft=RightToLeft.Yes,Height=76,Font=new Font("Segoe UI",11f)};
        local=MakeButton("اللعب المحلي",false);online=MakeButton("خادم جماعي",false);retry=MakeButton("إعادة المحاولة",true);
        close=MakeButton("×",false);close.Size=new Size(44,38);close.AccessibleName="إغلاق اللعبة";
        close.Click+=(_,_)=>FindForm()?.Close();
        local.Click+=(_,_)=>LocalRequested?.Invoke(this,EventArgs.Empty);
        online.Click+=(_,_)=>OnlineRequested?.Invoke(this,EventArgs.Empty);
        retry.Click+=(_,_)=>RetryRequested?.Invoke(this,EventArgs.Empty);
        Controls.AddRange(new Control[]{emblem,statusLabel,local,online,retry,close});
        local.Visible=online.Visible=retry.Visible=false;
        pulse=new System.Windows.Forms.Timer{Interval=32};
        pulse.Tick+=(_,_)=>{frame++;Invalidate();};
        VisibleChanged+=(_,_)=>{pulse.Enabled=Visible&&!failed;};
        Resize+=(_,_)=>Reflow();pulse.Start();Reflow();
    }
    private Button MakeButton(string text,bool primary)
    {
        var b=new Button{Text=text,Size=new Size(174,44),FlatStyle=FlatStyle.Flat,Cursor=Cursors.Hand,
            BackColor=primary?lime:Color.FromArgb(27,51,44),ForeColor=primary?Color.FromArgb(22,51,41):Color.FromArgb(237,243,234),
            Font=new Font("Segoe UI",10,FontStyle.Bold)};
        b.FlatAppearance.BorderSize=0;return b;
    }
    private float ContentTop => Math.Max(28,Height/2f-188);
    private void Reflow()
    {
        var center=Width/2;var top=(int)ContentTop;
        emblem.Location=new Point(center-64,top);
        statusLabel.SetBounds(Math.Max(20,center-350),top+281,Math.Min(700,Math.Max(100,Width-40)),76);
        retry.Location=new Point(center-87,top+378);local.Location=new Point(center-270,top+378);online.Location=new Point(center+96,top+378);
        close.Location=new Point(Math.Max(8,Width-60),16);Invalidate();
    }
    public void UpdateStatus(string message,bool error=false,bool working=false)
    {
        statusLabel.Text=message;failed=error;
        statusLabel.ForeColor=error?Color.FromArgb(255,182,176):Color.FromArgb(175,193,181);
        retry.Visible=local.Visible=online.Visible=error;
        pulse.Enabled=Visible&&!error;Reflow();
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);if(Width<1||Height<1)return;
        var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;g.TextRenderingHint=TextRenderingHint.AntiAliasGridFit;
        using(var bg=new LinearGradientBrush(ClientRectangle,Color.FromArgb(12,25,24),Color.FromArgb(20,44,37),65))g.FillRectangle(bg,ClientRectangle);
        var center=new PointF(Width/2f,Height/2f);
        using(var shape=new GraphicsPath())
        {
            shape.AddEllipse(center.X-390,center.Y-390,780,780);
            using var glow=new PathGradientBrush(shape){CenterColor=Color.FromArgb(26,194,241,124),SurroundColors=new[]{Color.FromArgb(0,194,241,124)}};
            g.FillPath(glow,shape);
        }
        using(var field=new Pen(Color.FromArgb(13,194,241,124),1))
        {
            g.DrawEllipse(field,center.X-310,center.Y-310,620,620);
            g.DrawEllipse(field,center.X-185,center.Y-185,370,370);
            g.DrawLine(field,center.X-500,center.Y+220,center.X+500,center.Y+220);
        }
        var family=fonts.Families.FirstOrDefault()??Font.FontFamily;
        using var title=new Font(family,48,FontStyle.Bold,GraphicsUnit.Pixel);
        using var subtitle=new Font(family,17,FontStyle.Regular,GraphicsUnit.Pixel);
        using var white=new SolidBrush(Color.FromArgb(237,243,234));using var accent=new SolidBrush(lime);
        using var muted=new SolidBrush(Color.FromArgb(125,153,138));
        using var centered=new StringFormat{Alignment=StringAlignment.Center,LineAlignment=StringAlignment.Center,FormatFlags=StringFormatFlags.DirectionRightToLeft};
        g.DrawString("حروف",title,white,new RectangleF(0,ContentTop+125,Width,70),centered);
        g.DrawString("الكورة",title,accent,new RectangleF(0,ContentTop+184,Width,76),centered);
        if(!failed)
        {
            var trackW=Math.Min(240,Width-80);var x=(Width-trackW)/2;var y=(int)ContentTop+365;
            using var track=new SolidBrush(Color.FromArgb(38,65,52));g.FillRectangle(track,x,y,trackW,3);
            var offset=frame*4%(trackW+80)-80;var from=Math.Max(0,offset);var to=Math.Min(trackW,offset+80);
            if(to>from)g.FillRectangle(accent,x+from,y,to-from,3);
        }
        g.DrawString("الملعب ينتظرك",subtitle,muted,new RectangleF(0,Height-72,Width,36),centered);
    }
    protected override void Dispose(bool disposing)
    {
        if(disposing){pulse.Stop();pulse.Dispose();emblem.Image?.Dispose();fonts.Dispose();foreach(var buffer in fontBuffers)Marshal.FreeCoTaskMem(buffer);}
        base.Dispose(disposing);
    }
}
