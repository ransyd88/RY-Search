param(
  [Parameter(Mandatory = $true)]
  [string]$SpritePath,

  [Parameter(Mandatory = $true)]
  [string]$MonogramPath,

  [string]$OutputDirectory = "public\brand"
)

Add-Type -AssemblyName System.Drawing

function Get-PaddedBounds {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [System.Drawing.Rectangle]$Region,
    [int]$Threshold = 40,
    [int]$Padding = 6
  )

  $minX = $Region.Right
  $minY = $Region.Bottom
  $maxX = -1
  $maxY = -1

  for ($y = $Region.Top; $y -lt $Region.Bottom; $y++) {
    for ($x = $Region.Left; $x -lt $Region.Right; $x++) {
      if ($Bitmap.GetPixel($x, $y).A -ge $Threshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0) {
    throw "No visible logo pixels were found in the supplied region."
  }

  $left = [Math]::Max(0, $minX - $Padding)
  $top = [Math]::Max(0, $minY - $Padding)
  $right = [Math]::Min($Bitmap.Width, $maxX + $Padding + 1)
  $bottom = [Math]::Min($Bitmap.Height, $maxY + $Padding + 1)

  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right, $bottom)
}

function Save-RecolouredLogo {
  param(
    [System.Drawing.Bitmap]$Source,
    [System.Drawing.Rectangle]$Bounds,
    [string]$HexColour,
    [string]$Destination
  )

  $colour = [System.Drawing.ColorTranslator]::FromHtml($HexColour)
  $output = New-Object System.Drawing.Bitmap(
    $Bounds.Width,
    $Bounds.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  for ($y = 0; $y -lt $Bounds.Height; $y++) {
    for ($x = 0; $x -lt $Bounds.Width; $x++) {
      $sourcePixel = $Source.GetPixel($Bounds.X + $x, $Bounds.Y + $y)
      $alpha = if ($sourcePixel.A -lt 16) { 0 } else { $sourcePixel.A }
      $output.SetPixel(
        $x,
        $y,
        [System.Drawing.Color]::FromArgb($alpha, $colour.R, $colour.G, $colour.B)
      )
    }
  }

  $output.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
}

function Save-OriginalCrop {
  param(
    [System.Drawing.Bitmap]$Source,
    [System.Drawing.Rectangle]$Bounds,
    [string]$Destination
  )

  $output = New-Object System.Drawing.Bitmap(
    $Bounds.Width,
    $Bounds.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  $graphics.DrawImage(
    $Source,
    [System.Drawing.Rectangle]::new(0, 0, $Bounds.Width, $Bounds.Height),
    $Bounds,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.Dispose()
  $output.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $output.Dispose()
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$sprite = New-Object System.Drawing.Bitmap($SpritePath)
$monogram = New-Object System.Drawing.Bitmap($MonogramPath)

try {
  $wordmarkBounds = Get-PaddedBounds `
    -Bitmap $sprite `
    -Region ([System.Drawing.Rectangle]::new(25, 110, 410, 160))

  $monogramBounds = Get-PaddedBounds `
    -Bitmap $monogram `
    -Region ([System.Drawing.Rectangle]::new(500, 220, 650, 540))

  $faviconBounds = Get-PaddedBounds `
    -Bitmap $sprite `
    -Region ([System.Drawing.Rectangle]::new(675, 755, 210, 190)) `
    -Padding 4

  $colours = @{
    "slate" = "#3F4B58"
    "gold" = "#C9B78F"
    "white" = "#FBFAF7"
  }

  foreach ($entry in $colours.GetEnumerator()) {
    Save-RecolouredLogo `
      -Source $sprite `
      -Bounds $wordmarkBounds `
      -HexColour $entry.Value `
      -Destination (Join-Path $resolvedOutput "wordmark-$($entry.Key).png")

    Save-RecolouredLogo `
      -Source $monogram `
      -Bounds $monogramBounds `
      -HexColour $entry.Value `
      -Destination (Join-Path $resolvedOutput "monogram-$($entry.Key).png")
  }

  Save-OriginalCrop `
    -Source $sprite `
    -Bounds $faviconBounds `
    -Destination (Join-Path $resolvedOutput "favicon.png")
}
finally {
  $sprite.Dispose()
  $monogram.Dispose()
}
