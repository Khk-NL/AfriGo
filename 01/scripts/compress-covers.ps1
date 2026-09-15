
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$jobs = Get-Content -LiteralPath 'C:/Users/25374/Desktop/小程序/01/scripts/cover-jobs.json' -Encoding UTF8 | ConvertFrom-Json
foreach ($job in $jobs) {
  $src = [string]$job.src
  $dst = [string]$job.dst
  $img = [System.Drawing.Image]::FromFile($src)
  $maxW = 800
  $ratio = [Math]::Min(1.0, $maxW / $img.Width)
  $w = [int][Math]::Max(1, $img.Width * $ratio)
  $h = [int][Math]::Max(1, $img.Height * $ratio)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $enc = New-Object System.Drawing.Imaging.EncoderParameters 1
  $enc.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]68)
  $bmp.Save($dst, $codec, $enc)
  $g.Dispose()
  $bmp.Dispose()
  $img.Dispose()
  Write-Output ("OK " + $dst)
}
