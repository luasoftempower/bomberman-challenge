# Read source alpha bounds, without resampling or modifying the illustrated atlas.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = Split-Path $PSScriptRoot -Parent
$sheet = [System.Drawing.Bitmap]::FromFile((Join-Path $project 'public/arena-props.png'))
$frames = @()
for ($row=0; $row -lt 2; $row++) {
 for ($col=0; $col -lt 2; $col++) {
  $x0=[int][Math]::Round($col*$sheet.Width/2); $x1=[int][Math]::Round(($col+1)*$sheet.Width/2)
  $y0=[int][Math]::Round($row*$sheet.Height/2); $y1=[int][Math]::Round(($row+1)*$sheet.Height/2)
  $left=$x1; $right=$x0; $top=$y1; $bottom=$y0
  for($y=$y0;$y -lt $y1;$y++){for($x=$x0;$x -lt $x1;$x++){
   if($sheet.GetPixel($x,$y).A -gt 48){$left=[Math]::Min($left,$x);$right=[Math]::Max($right,$x);$top=[Math]::Min($top,$y);$bottom=[Math]::Max($bottom,$y)}
  }}
  if($right -le $left){throw 'Empty atlas cell'}
  $left=[Math]::Max($x0,$left-2);$top=[Math]::Max($y0,$top-2)
  $right=[Math]::Min($x1,$right+3);$bottom=[Math]::Min($y1,$bottom+3)
  $frames += "[$left,$top,$($right-$left),$($bottom-$top)]"
 }
}
$names=@('wall','crate','charge','alert')
$lines=for($i=0;$i -lt 4;$i++){"  $($names[$i]): $($frames[$i]),"}
$output="// Measured alpha bounds from arena-props.png.`nexport const ARENA_ATLAS = {`n width: $($sheet.Width), height: $($sheet.Height),`n"+($lines -join "`n")+"`n};`n"
Set-Content -Encoding utf8 (Join-Path $project 'client/arena-atlas-data.js') $output
$sheet.Dispose()
