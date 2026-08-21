Add-Type -AssemblyName System.Drawing
$src = 'C:/Users/32372/hermes-workspace/巫祝page/巫/分支图.jpg'
$dst = 'C:/Users/32372/hermes-workspace/巫祝page/.qa/分支图-small.png'
$img = [System.Drawing.Image]::FromFile($src)
$nw = 1200
$nh = [int]($img.Height * $nw / $img.Width)
$bmp = New-Object System.Drawing.Bitmap($nw, $nh)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $nw, $nh)
$bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
Write-Output ('saved ' + $nw + 'x' + $nh)