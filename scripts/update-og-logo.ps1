param(
  [string]$OpenGraphPath = "public\og.png",
  [string]$WordmarkPath = "public\brand\wordmark-slate.png"
)

Add-Type -AssemblyName System.Drawing

$resolvedOpenGraphPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OpenGraphPath))
$resolvedWordmarkPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $WordmarkPath))

$source = New-Object System.Drawing.Bitmap($resolvedOpenGraphPath)
$wordmark = New-Object System.Drawing.Bitmap($resolvedWordmarkPath)
$output = New-Object System.Drawing.Bitmap(
  $source.Width,
  $source.Height,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($output)

try {
  $graphics.DrawImageUnscaled($source, 0, 0)
  $background = $source.GetPixel(520, 100)
  $backgroundBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(255, $background.R, $background.G, $background.B)
  )

  try {
    $graphics.FillRectangle($backgroundBrush, 55, 130, 1010, 395)
  }
  finally {
    $backgroundBrush.Dispose()
  }

  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  $targetWidth = 820
  $targetHeight = [int][Math]::Round($targetWidth * $wordmark.Height / $wordmark.Width)
  $graphics.DrawImage(
    $wordmark,
    [System.Drawing.Rectangle]::new(95, 260, $targetWidth, $targetHeight),
    0,
    0,
    $wordmark.Width,
    $wordmark.Height,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}
finally {
  $graphics.Dispose()
  $wordmark.Dispose()
  $source.Dispose()
}

$output.Save($resolvedOpenGraphPath, [System.Drawing.Imaging.ImageFormat]::Png)
$output.Dispose()
