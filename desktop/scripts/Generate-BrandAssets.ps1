# Generate the official Huroof AlKora Windows icon from the website's lime/dark identity.
# No image downloads or external packages. System.Drawing runs on the Windows build runner.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assets = Join-Path $PSScriptRoot '..\src\HuroofAlKora\Assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$sz = 512
$bitmap = [System.Drawing.Bitmap]::new($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)
$lime = [System.Drawing.Color]::FromArgb(194,241,124)
$ink = [System.Drawing.Color]::FromArgb(18,52,42)
$g.TranslateTransform(256,256)
$g.RotateTransform(-8)
$bg = [System.Drawing.Drawing2D.GraphicsPath]::new()
$side=404; $x=-202; $y=-202; $radius=90; $d=2*$radius
$bg.AddArc($x,$y,$d,$d,180,90)
$bg.AddArc($x+$side-$d,$y,$d,$d,270,90)
$bg.AddArc($x+$side-$d,$y+$side-$d,$d,$d,0,90)
$bg.AddArc($x,$y+$side-$d,$d,$d,90,90)
$bg.CloseFigure()
$fill = [System.Drawing.SolidBrush]::new($lime)
$g.FillPath($fill,$bg)
$bg.Dispose()
$fill.Dispose()
$g.ResetTransform()
$pen = [System.Drawing.Pen]::new($ink,22)
$pen.StartCap=[System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap=[System.Drawing.Drawing2D.LineCap]::Round
# Recreate the site's goal / play emblem in dark green.
$g.DrawArc($pen,142,153,228,224,32,295)
$g.DrawArc($pen,174,190,164,161,30,278)
$g.DrawLine($pen,257,130,257,224)
$pts=[System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(257,142),
    [System.Drawing.Point]::new(350,196),
    [System.Drawing.Point]::new(257,249)
)
$g.DrawPolygon($pen,$pts)
$ball=[System.Drawing.SolidBrush]::new($ink)
$g.FillEllipse($ball,299,328,32,32)
$ball.Dispose(); $pen.Dispose(); $g.Dispose()
$master=Join-Path $assets 'HuroofAlKora-master.png'
$bitmap.Save($master,[System.Drawing.Imaging.ImageFormat]::Png)
function Save-Scaled([int]$width,[int]$height,[string]$name) {
  $img=[System.Drawing.Bitmap]::new($width,$height)
  $graphics=[System.Drawing.Graphics]::FromImage($img)
  $graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($bitmap,0,0,$width,$height)
  $graphics.Dispose()
  $img.Save((Join-Path $assets $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
}
Save-Scaled 44 44 'Square44x44Logo.png'
Save-Scaled 150 150 'Square150x150Logo.png'
Save-Scaled 310 310 'Square310x310Logo.png'
Save-Scaled 50 50 'StoreLogo.png'
Save-Scaled 310 150 'Wide310x150Logo.png'
$iconBmp=[System.Drawing.Bitmap]::new(256,256)
$ig=[System.Drawing.Graphics]::FromImage($iconBmp)
$ig.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$ig.DrawImage($bitmap,0,0,256,256)
$ig.Dispose()
$stream=[System.IO.MemoryStream]::new()
$iconBmp.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
$png=$stream.ToArray(); $stream.Dispose(); $iconBmp.Dispose()
$iconPath=Join-Path $assets 'HuroofAlKora.ico'
$out=[System.IO.File]::Open($iconPath,[System.IO.FileMode]::Create)
$writer=[System.IO.BinaryWriter]::new($out)
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]1)
$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0)
$writer.Write([uint16]1);$writer.Write([uint16]32)
$writer.Write([uint32]$png.Length);$writer.Write([uint32]22)
$writer.Write($png)
$writer.Flush();$writer.Dispose()
$bitmap.Dispose()
Write-Host 'Generated matching site-brand PNG and ICO assets locally.'
