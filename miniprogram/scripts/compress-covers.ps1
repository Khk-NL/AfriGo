
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Resolve relative job paths against this script's folder, so cover-jobs.json
# keeps working after the repository is moved or renamed.
# NOTE: keep this file ASCII-only; Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI.
function Resolve-JobPath([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw 'cover job path is empty' }
  if ([System.IO.Path]::IsPathRooted($value)) { return $value }
  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $value))
}

$jobs = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'cover-jobs.json') -Encoding UTF8 | ConvertFrom-Json
foreach ($job in $jobs) {
  $src = Resolve-JobPath ([string]$job.src)
  $dst = Resolve-JobPath ([string]$job.dst)
  New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($dst)) | Out-Null
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
