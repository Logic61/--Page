$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$dir = "C:\Users\32372\hermes-workspace\巫祝page\.dsh-filess\samples"
$src = @(
  @{ in = "$dir\sample-xinyang.jpg"; out = "$dir\sample-xinyang-clean.jpg" },
  @{ in = "$dir\sample-lunhui.jpg";  out = "$dir\sample-lunhui-clean.jpg"  }
)

# 裁掉右下角 18% 宽 x 8% 高的水印区,其余保持原比例
# 原图 2752x1536,水印在右下角
foreach ($f in $src) {
  $img = [System.Drawing.Image]::FromFile($f.in)
  $W = $img.Width
  $H = $img.Height
  $cropW = [int]($W * 0.82)  # 裁掉右侧 18%
  $cropH = [int]($H * 0.94)  # 裁掉底部 6%
  $rect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
  $bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($img, $rect, [System.Drawing.Rectangle]::FromLTRB(0, 0, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save($f.out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  Write-Output ("cropped: " + $f.out + "  " + $cropW + "x" + $cropH)
}
