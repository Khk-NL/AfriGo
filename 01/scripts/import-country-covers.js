const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC_DIR = path.join('C:/Users/25374/Desktop/小程序/小程序数据/国家封面照片');
const OUT_DIR = path.join(__dirname, '../assets/images/covers');
const TEMP_DIR = path.join(os.tmpdir(), 'afrigo-covers');

const mapping = [
  { out: 'drc.jpg', file: '刚果河.jpg' },
  { out: 'ghana.jpg', file: '加纳黑星门1.jpg' },
  { out: 'ghana-2.jpg', file: '加纳黑星门2.jpg' },
  { out: 'egypt.jpg', file: '埃及吉萨金字塔1.jpg' },
  { out: 'egypt-2.jpg', file: '埃及拉美西斯二世2.jpg' },
  { out: 'angola.jpg', file: '安哥拉罗安达城市2.jpg' },
  { out: 'angola-2.jpg', file: '安哥拉穆希马小镇1.jpg' },
  { out: 'nigeria.jpg', file: '尼日利亚莱基桥1.jpg' },
  { out: 'nigeria-2.jpg', file: '尼日利亚莱基桥2.jpg' },
  { out: 'south-africa.jpg', file: '南非桌山1.jpg' },
  { out: 'south-africa-2.jpg', file: '南非好望角2.jpg' },
  { out: 'madagascar.jpg', file: '马达加斯加猴面包树1.jpg' },
  { out: 'madagascar-2.jpg', file: '马达加斯加海滩2.jpg' },
  { out: 'tanzania.jpg', file: '坦桑尼亚乞力马扎罗山1.jpg' },
  { out: 'tanzania-2.jpg', file: '坦桑尼亚角马大迁徙2.jpg' },
  { out: 'kenya.jpg', file: '肯尼亚马赛马拉保护区1.jpg' },
  { out: 'kenya-2.jpg', file: '肯尼亚动物迁徙2.jpg' },
  { out: 'cote-divoire.jpg', file: '科特迪瓦露天市集.jpg' },
  { out: 'zambia.jpg', file: '赞比亚维多利亚瀑布.jpg' },
  { out: 'uganda.jpg', file: '乌干达默奇森瀑布1.jpg' },
  { out: 'guinea.jpg', file: '几内亚宁巴山自然保护区1.jpg' },
  { out: 'guinea-2.jpg', file: '几内亚巴山自然保护区2.jpg' },
  { out: 'guinea-3.jpg', file: '几内亚.jpg' },
  { out: 'roc.jpg', file: '刚果布布拉柴维尔与刚果河1.jpg' },
  { out: 'liberia.jpg', file: '利比里亚.jpg' },
  { out: 'ethiopia.jpg', file: '埃塞俄比亚青尼罗河瀑布1.jpg' },
  { out: 'ethiopia-2.jpg', file: '埃塞俄比亚拉利贝拉岩石教堂2.jpg' },
  { out: 'senegal.jpg', file: '塞内加尔.jpg' },
  { out: 'zimbabwe.jpg', file: '津巴布韦维多利亚大瀑布1.jpg' },
  { out: 'zimbabwe-2.jpg', file: '大津巴布韦遗址2.jpg' },
  { out: 'morocco.jpg', file: '摩洛哥舍夫沙万蓝城1.jpg' },
  { out: 'morocco-2.jpg', file: '摩洛哥清真寺2.jpg' },
  { out: 'mozambique.jpg', file: '莫桑比克维兰库斯海滩1.jpg' },
  { out: 'algeria.jpg', file: '阿尔及利亚阿杰尔高原撒哈拉地貌1.jpg' },
  { out: 'algeria-2.jpg', file: '阿尔及利亚古罗马提姆加德遗址2.jpg' }
];

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

const jobs = mapping.map((item) => ({
  src: path.join(SRC_DIR, item.file),
  dst: path.join(OUT_DIR, item.out)
}));

const missing = jobs.filter((item) => !fs.existsSync(item.src));
if (missing.length) {
  console.error('missing source files');
  missing.forEach((item) => console.error(item.src));
  process.exit(1);
}

const listPath = path.join(TEMP_DIR, 'cover-jobs.json');
fs.writeFileSync(listPath, '\uFEFF' + JSON.stringify(jobs, null, 2), 'utf8');

const ps1 = path.join(TEMP_DIR, 'compress-covers.ps1');
fs.writeFileSync(ps1, `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$jobs = Get-Content -LiteralPath '${listPath.replace(/\\/g, '/')}' -Encoding UTF8 | ConvertFrom-Json
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
  Write-Output ("OK " + ([IO.Path]::GetFileName($dst)))
}
`, 'utf8');

const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
  encoding: 'utf8'
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status !== 0) {
  process.exit(result.status || 1);
}

for (const item of jobs) {
  const size = fs.statSync(item.dst).size;
  console.log(path.basename(item.dst), Math.round(size / 1024) + 'KB');
}
