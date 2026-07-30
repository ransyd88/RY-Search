param(
  [string]$OutputPath = "public\brand\cursor-arrow-right-glow-small-v4.png"
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null

$bitmap = New-Object System.Drawing.Bitmap(
  24,
  24,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

try {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Compact version of the supplied right-facing arrow: tall leading edge,
  # pointed nose and a single inward notch before the lower corner.
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(4.5, 3.0),
    [System.Drawing.PointF]::new(20.5, 12.0),
    [System.Drawing.PointF]::new(13.5, 14.5),
    [System.Drawing.PointF]::new(6.0, 21.0)
  )
  $path.AddPolygon($points)

  $glowPen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(105, 109, 190, 250),
    4.0
  )
  $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawPath($glowPen, $path)
  $glowPen.Dispose()

  $fillBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(255, 5, 9, 14)
  )
  $graphics.FillPath($fillBrush, $path)
  $fillBrush.Dispose()

  $outlinePen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(245, 184, 220, 250),
    1.2
  )
  $outlinePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawPath($outlinePen, $path)
  $outlinePen.Dispose()

  $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $path.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
