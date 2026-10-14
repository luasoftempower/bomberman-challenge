# Rebuild pixel PNGs directly from the same geometry used by the game.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = Split-Path $PSScriptRoot -Parent
$data = node (Join-Path $PSScriptRoot 'identity-rects.mjs') | ConvertFrom-Json
function Paint-Sprite($rectangles, $file) {
  $bitmap = New-Object System.Drawing.Bitmap 256,256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  foreach ($r in $rectangles) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($r[0]))
    $graphics.FillRectangle($brush, [int]$r[1]*4, [int]$r[2]*4, [int]$r[3]*4, [int]$r[4]*4)
    $brush.Dispose()
  }
  $bitmap.Save((Join-Path $project "public/$file"), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
Paint-Sprite $data.charge 'charge-prism.png'

& (Join-Path $PSScriptRoot "prepare-cyborgs.ps1")
