param(
    [string]$IndexPath = "D:\Documents\Project\wx-id5-strategy\data\localMapIndex.js",
    [string]$Root = "D:\Documents\Project\wx-id5-strategy",
    [double]$PerPackageBudgetMB = 1.85,
    [switch]$DryRun,
    [switch]$IncludeVideo
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Get-NodeJson {
    param([string]$IndexPath)
    $dir = Join-Path $env:TEMP ("id5-index-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    $arg1 = $IndexPath | ConvertTo-Json
    $arg2 = (Join-Path $dir "out.json") | ConvertTo-Json
    $code = "const m = require(" + $arg1 + "); require('fs').writeFileSync(" + $arg2 + ", JSON.stringify(m))"
    $codeFile = Join-Path $dir "dump.js"
    [System.IO.File]::WriteAllText($codeFile, $code, (New-Object System.Text.UTF8Encoding($true)))
    & node $codeFile
    if ($LASTEXITCODE -ne 0) { throw "node 解析索引失败" }
    $json = [System.IO.File]::ReadAllText((Join-Path $dir "out.json"), [System.Text.Encoding]::UTF8)
    Remove-Item -LiteralPath $dir -Recurse -Force
    return $json | ConvertFrom-Json
}

function Compress-One {
    param([string]$Src, [string]$Dst, [int]$Width, [int]$Quality)
    $img = [System.Drawing.Image]::FromFile($Src)
    try {
        $scale = 1.0
        if ($img.Width -gt $Width) { $scale = [double]$Width / $img.Width }
        if ($scale -ge 1.0) {
            $img.Save($Dst, "image/jpeg")
            return
        }
        $bmp = New-Object System.Drawing.Bitmap([int]($img.Width * $scale), [int]($img.Height * $scale))
        try {
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.DrawImage($img, 0, 0, $bmp.Width, $bmp.Height)
            } finally { $g.Dispose() }
            $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
            $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
            $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
            $bmp.Save($Dst, $codec, $ep)
        } finally { $bmp.Dispose() }
    } finally { $img.Dispose() }
}

$index = Get-NodeJson -IndexPath $IndexPath
$budgetBytes = [long]($PerPackageBudgetMB * 1MB)
$widths = @(1280, 1024, 800, 640)
$report = @()

foreach ($map in $index.maps) {
    $anchor = $map.sourceAnchor -replace "/", "\"
    if (-not $anchor.EndsWith("\")) { $anchor += "\" }
    foreach ($route in $map.routes) {
        $routeId = $route.id
        $files = @()
        foreach ($shapeProp in $route.shapeDetails.PSObject.Properties) {
            foreach ($doorObj in $shapeProp.Value.doors) {
                foreach ($fn in $doorObj.files) {
                    $files += [PSCustomObject]@{
                        Src = $anchor + $route.shapeDir + "\" + $shapeProp.Name + "\" + $doorObj.door + "\" + $fn
                        Rel = $shapeProp.Name + "/" + $doorObj.door + "/" + $fn
                    }
                }
            }
        }
        foreach ($fn in $route.rootFiles) {
            $files += [PSCustomObject]@{ Src = $anchor + $route.shapeDir + "\" + $fn; Rel = $fn }
        }

        $srcBytes = ($files | ForEach-Object { (Get-Item -LiteralPath $_.Src).Length } | Measure-Object -Sum).Sum
        $estBytes = [long]($srcBytes * 0.05)

        if ($DryRun) {
            $fit = "NONE"
            $pkg = 0
            foreach ($w in $widths) {
                $cand = [long]($srcBytes * 0.045 * ($w / 1280.0) * ($w / 1280.0))
                if ($cand -le $budgetBytes) { $pkg = $cand; $fit = "${w}px"; break }
            }
            Write-Host ("[DRY] {0,-5} {1,3}张 源{2,6:N1}MB -> 估算{3,5:N2}MB 档位{4}" -f $routeId, $files.Count, ($srcBytes/1MB), ($pkg/1MB), $fit)
            continue
        }

        $tempDir = Join-Path $env:TEMP ("id5-compress-" + $routeId + "-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        $usedWidth = 0
        $usedQ = 70
        foreach ($w in $widths) {
            $total = 0
            foreach ($f in $files) {
                $tmpDst = Join-Path $tempDir ($f.Rel -replace "/", "\")
                $parent = Split-Path -Parent $tmpDst
                if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                Compress-One -Src $f.Src -Dst $tmpDst -Width $w -Quality $usedQ
                $total += (Get-Item -LiteralPath $tmpDst).Length
            }
            $used = $w
            Write-Host ("  {0}: {1}px/q{2} = {3:N1}MB (预算 {4:N1}MB)" -f $routeId, $w, $usedQ, ($total/1MB), ($budgetBytes/1MB))
            if ($total -le $budgetBytes) { break }
        }
        $pkgDir = Join-Path $Root ("pkg-" + $routeId)
        $assetsDir = Join-Path $pkgDir "assets"
        if (Test-Path -LiteralPath $assetsDir) { Remove-Item -LiteralPath $assetsDir -Recurse -Force }
        $pkgBytes = 0L
        foreach ($f in $files) {
            $relWin = $f.Rel -replace "/", "\"
            $tmpSrc = Join-Path $tempDir $relWin
            $dst = Join-Path $assetsDir $relWin
            $dstDir = Split-Path -Parent $dst
            if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
            Copy-Item -LiteralPath $tmpSrc -Destination $dst -Force
            $pkgBytes += (Get-Item -LiteralPath $dst).Length
        }
        Remove-Item -LiteralPath $tempDir -Recurse -Force
        $report += [PSCustomObject]@{ Route = $routeId; Pkg = "pkg-$routeId"; Count = $files.Count; Bytes = $pkgBytes }
        Write-Host ("[OK] {0,-5} -> pkg-{0}/assets  {1,3} 张  {2:N1} MB" -f $routeId, $files.Count, ($pkgBytes/1MB))
    }
}

if (-not $DryRun) {
    $total = ($report | Measure-Object Bytes -Sum).Sum
    Write-Host ""
    Write-Host ("=== 素材导入完成: {0} 个分包 | 合计 {1:N1} MB（总分包上限 30MB，单包 2MB） ===" -f $report.Count, ($total/1MB))
    foreach ($r in $report) {
        $flag = if ($r.Bytes -gt 2MB) { " !! 超单包2MB" } else { " OK" }
        Write-Host ("  {0,-12} {1,3} 张  {2:N1} MB{3}" -f $r.Pkg, $r.Count, ($r.Bytes/1MB), $flag)
    }
    $json = $report | ConvertTo-Json -Depth 2
    [System.IO.File]::WriteAllText((Join-Path $Root "tools\import-report.json"), $json, (New-Object System.Text.UTF8Encoding($true)))
    Write-Host "报告: tools/import-report.json"
}

if ($IncludeVideo) {
    Write-Host ""
    Write-Host "=== 视频教学资源（不打包，仅统计） ==="
    $anchor = $index.maps[0].sourceAnchor -replace "/", "\"
    $vid = Get-ChildItem -LiteralPath $anchor -File -Recurse | Where-Object { $_.Extension -in ".mp4", ".mov", ".avi", ".wmv", ".mkv", ".flv" }
    if ($vid) {
        foreach ($v in $vid) { Write-Host ("  {0:N1} MB  {1}" -f ($v.Length/1MB), $v.FullName) }
        $vb = ($vid | Measure-Object Length -Sum).Sum
        Write-Host ("  视频 {0} 个，共 {1:N1} MB —— 建议上传云端（如 COS/对象存储），页面用 video 组件按 URL 播放" -f $vid.Count, ($vb/1MB))
    } else {
        Write-Host "  未发现视频文件（子文件夹名：1，下面视频教学必看！！！ 等为目录级命名）"
    }
}