# Build assets from the EXACT Lucide "goal" geometry supplied for the official website.
# Uses only Windows WPF and System.Drawing; no network downloads or external packages.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\src\HuroofAlKora\Assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$lime = [System.Windows.Media.Color]::FromRgb(194,241,124)
$ink = [System.Windows.Media.Color]::FromRgb(22,51,41)
$limeBrush = [System.Windows.Media.SolidColorBrush]::new($lime)
$inkBrush = [System.Windows.Media.SolidColorBrush]::new($ink)
$limeBrush.Freeze()
$inkBrush.Freeze()
$visual = [System.Windows.Media.DrawingVisual]::new()
$dc = $visual.RenderOpen()

# Matching <span class="brand-mark">: lime rounded square tilted -8 degrees.
$dc.PushTransform([System.Windows.Media.RotateTransform]::new(-8,256,256))
$dc.DrawRoundedRectangle($limeBrush,$null,[System.Windows.Rect]::new(54,54,404,404),85,85)
$dc.Pop()

# Exact <Goal /> lucide stroke paths in 24x24 SVG viewBox; no invented ball or different icon.
$dc.PushTransform([System.Windows.Media.TranslateTransform]::new(82,82))
$dc.PushTransform([System.Windows.Media.ScaleTransform]::new(14.5,14.5))
$pen = [System.Windows.Media.Pen]::new($inkBrush,2)
$pen.StartLineCap = [System.Windows.Media.PenLineCap]::Round
$pen.EndLineCap = [System.Windows.Media.PenLineCap]::Round
$pen.LineJoin = [System.Windows.Media.PenLineJoin]::Round
$geometryPaths = @(
  'M12 13 V2 L20 6 L12 10',
  'M20.561 10.222 a9 9 0 1 1 -12.55 -5.29',
  'M8.002 9.997 a5 5 0 1 0 8.9 2.02'
)
foreach($path in $geometryPaths) {
    $geometry = [System.Windows.Media.Geometry]::Parse($path)
    $dc.DrawGeometry($null,$pen,$geometry)
}
$dc.Pop()
$dc.Pop()
$dc.Close()

$render = [System.Windows.Media.Imaging.RenderTargetBitmap]::new(512,512,96,96,[System.Windows.Media.PixelFormats]::Pbgra32)
$render.Render($visual)
$encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
$encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($render))
$master = Join-Path $assets 'HuroofAlKora-master.png'
$file = [System.IO.File]::Create($master)
try { $encoder.Save($file) } finally { $file.Dispose() }

$bitmap = [System.Drawing.Bitmap]::new($master)
function Save-Scaled([int]$width,[int]$height,[string]$name) {
  $result = [System.Drawing.Bitmap]::new($width,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($result)
  $graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.Color]::Transparent)
  # Don't stretch square icon on wide banners.
  $size = [Math]::Min($width,$height)
  $left = [int](($width-$size)/2)
  $top = [int](($height-$size)/2)
  $graphics.DrawImage($bitmap,$left,$top,$size,$size)
  $graphics.Dispose()
  $result.Save((Join-Path $assets $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $result.Dispose()
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
Write-Host "Generated official Lucide Goal assets (exact paths, matching CSS colors)."
