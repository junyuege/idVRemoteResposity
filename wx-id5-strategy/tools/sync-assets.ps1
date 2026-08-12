param(
    [string]$IndexPath = "D:\Documents\Project\wx-id5-strategy\data\localMapIndex.js",
    [string]$Root = "D:\Documents\Project\wx-id5-strategy",
    [double]$PerPackageBudgetMB = 1.85,
    [switch]$DryRun,
    [switch]$IncludeVideo,
    [switch]$PruneExtras
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

# 难度 -> 分包根目录映射（与 data/api.js ROUTE_PACKAGE 保持一致）
# 多个难度可合并进同一分包（如 全棺版 hard 与 速刷版 hard_fast 共用 pkg-hard），
# 同名文件路径以优先级高的路线为准：速刷版(hard_fast=4) 覆盖 全棺版(hard=3)
$RoutePackage = @{
    hard = 'pkg-hard'; hard_fast = 'pkg-hard'
    normal = 'pkg-normal'; easy = 'pkg-easy'; newbie = 'pkg-newbie'
}
$RoutePriority = @{ newbie = 0; easy = 1; normal = 2; hard = 3; hard_fast = 4 }

# 第一步：按分包聚合全部文件（src + rel），同名 rel 以优先级高的路线为准
$pkgPlans = @{}
foreach ($map in $index.maps) {
    $anchor = $map.sourceAnchor -replace "/", "\"
    if (-not $anchor.EndsWith("\")) { $anchor += "\" }
    foreach ($route in $map.routes) {
        $pkg = if ($RoutePackage.ContainsKey($route.id)) { $RoutePackage[$route.id] } else { "pkg-" + $route.id }
        $priority = if ($RoutePriority.ContainsKey($route.id)) { $RoutePriority[$route.id] } else { 99 }
        if (-not $pkgPlans.ContainsKey($pkg)) { $pkgPlans[$pkg] = @{} }
        foreach ($shapeProp in $route.shapeDetails.PSObject.Properties) {
            foreach ($fn in $shapeProp.Value.rootFiles) {
                # 形状根目录散图（不经过侧门子文件夹）
                $src = $anchor + $route.shapeDir + "\" + $shapeProp.Name + "\" + $fn
                $rel = $shapeProp.Name + "/" + $fn
                $pkgPlans[$pkg][$rel] = [PSCustomObject]@{ Src = $src; Priority = $priority }
            }
            foreach ($doorObj in $shapeProp.Value.doors) {
                foreach ($fn in $doorObj.files) {
                    # 优先 shape/door/文件 三层；素材侧部分形状把图片直接放在 shape 根（门名在文件名里），回退到根级
                    $cand1 = $anchor + $route.shapeDir + "\" + $shapeProp.Name + "\" + $doorObj.door + "\" + $fn
                    $cand2 = $anchor + $route.shapeDir + "\" + $shapeProp.Name + "\" + $fn
                    $src = if (Test-Path -LiteralPath $cand1) { $cand1 } else { $cand2 }
                    $rel = $shapeProp.Name + "/" + $doorObj.door + "/" + $fn
                    $pkgPlans[$pkg][$rel] = [PSCustomObject]@{ Src = $src; Priority = $priority }
                }
            }
        }
        foreach ($fn in $route.rootFiles) {
            $rel = $fn
            $pkgPlans[$pkg][$rel] = [PSCustomObject]@{ Src = $anchor + $route.shapeDir + "\" + $fn; Priority = $priority }
        }
    }
}

# 预检：索引列出的所有源文件必须存在，一次列全，快速失败
$allEntries = @()
foreach ($pkg in ($pkgPlans.Keys | Sort-Object)) {
    $plan = $pkgPlans[$pkg]
    foreach ($kv in $plan.GetEnumerator()) {
        $allEntries += [PSCustomObject]@{ Pkg = $pkg; Src = $kv.Value.Src; Rel = $kv.Key; Priority = $kv.Value.Priority }
    }
}
$missingSrc = $allEntries | Where-Object { -not (Test-Path -LiteralPath $_.Src) }
if ($missingSrc.Count -gt 0) {
    Write-Host ("=== 源文件缺失 {0} 个（索引与源盘不一致，请检查素材命名或在索引中删除） ===" -f $missingSrc.Count)
    foreach ($m in $missingSrc) {
        Write-Host ("  [{0}] {1}" -f $m.Pkg, $m.Src)
    }
    exit 2
}

# 第二步：按分包统一压缩写入
foreach ($pkg in ($pkgPlans.Keys | Sort-Object)) {
    $plan = $pkgPlans[$pkg]
    $entries = $plan.GetEnumerator() | ForEach-Object {
        [PSCustomObject]@{ Src = $_.Value.Src; Rel = $_.Key; Priority = $_.Value.Priority }
    } | Sort-Object Priority | ForEach-Object { [PSCustomObject]@{ Src = $_.Src; Rel = $_.Rel } }

    $srcBytes = ($entries | ForEach-Object { (Get-Item -LiteralPath $_.Src).Length } | Measure-Object -Sum).Sum

    if ($DryRun) {
        $fit = "NONE"
        $est = 0
        foreach ($w in $widths) {
            $cand = [long]($srcBytes * 0.045 * ($w / 1280.0) * ($w / 1280.0))
            if ($cand -le $budgetBytes) { $est = $cand; $fit = "${w}px"; break }
        }
        Write-Host ("[DRY] {0,-12} {1,3}张 源{2,6:N1}MB -> 估算{3,5:N2}MB 档位{4}" -f $pkg, $entries.Count, ($srcBytes/1MB), ($est/1MB), $fit)
        continue
    }

    $tempDir = Join-Path $env:TEMP ("id5-compress-" + $pkg + "-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    $usedQ = 70
    $total = 0
    foreach ($q in @(70, 60, 50)) {
        $usedQ = $q
        foreach ($w in $widths) {
            $total = 0
            foreach ($f in $entries) {
                $tmpDst = Join-Path $tempDir ($f.Rel -replace "/", "\")
                $parent = Split-Path -Parent $tmpDst
                if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                Compress-One -Src $f.Src -Dst $tmpDst -Width $w -Quality $usedQ
                $total += (Get-Item -LiteralPath $tmpDst).Length
            }
            Write-Host ("  {0}: {1}px/q{2} = {3:N1}MB (预算 {4:N1}MB)" -f $pkg, $w, $usedQ, ($total/1MB), ($budgetBytes/1MB))
            if ($total -le $budgetBytes) { break }
        }
        if ($total -le $budgetBytes) { break }
    }
    $assetsDir = Join-Path $Root ($pkg + "\assets")
    if (Test-Path -LiteralPath $assetsDir) { Remove-Item -LiteralPath $assetsDir -Recurse -Force }
    $pkgBytes = 0L
    foreach ($f in $entries) {
        $relWin = $f.Rel -replace "/", "\"
        $tmpSrc = Join-Path $tempDir $relWin
        $dst = Join-Path $assetsDir $relWin
        $dstDir = Split-Path -Parent $dst
        if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
        Copy-Item -LiteralPath $tmpSrc -Destination $dst -Force
        $pkgBytes += (Get-Item -LiteralPath $dst).Length
    }
    Remove-Item -LiteralPath $tempDir -Recurse -Force
    # 一致性校验：产物目录 vs 索引计划 双向比对
    $expected = @($entries | ForEach-Object { $_.Rel })
    $actual = @(Get-ChildItem -LiteralPath $assetsDir -Recurse -File | ForEach-Object { $_.FullName.Substring($assetsDir.Length + 1) -replace "\\", "/" })
    $missing = @($expected | Where-Object { $_ -notin $actual })
    $extraAll = @($actual | Where-Object { $_ -notin $expected })
    $pruned = @()
    if ($PruneExtras) {
        foreach ($x in $extraAll) {
            Remove-Item -LiteralPath (Join-Path $assetsDir ($x -replace "/", "\")) -Force
            $pruned += $x
        }
    }
    $extra = @($extraAll | Where-Object { $_ -notin $pruned })
    $report += [PSCustomObject]@{ Pkg = $pkg; Count = $entries.Count; Bytes = $pkgBytes; Missing = $missing; Extra = $extra; MissingCount = $missing.Count; ExtraCount = $extra.Count; Pruned = $pruned.Count }
    $status = if ($missing.Count -eq 0 -and $extra.Count -eq 0) { "OK" } else { "!!" }
    Write-Host ("[{0}] {1,-12} {2,3} 张  {3:N1} MB  校验: 缺失{4} 多余{5}{6}" -f $status, $pkg, $entries.Count, ($pkgBytes/1MB), $missing.Count, $extra.Count, $(if ($pruned.Count) { " 清理$($pruned.Count)" } else { "" }))
    foreach ($m in $missing) { Write-Host ("    缺失: {0}" -f $m) }
    foreach ($x in $extra) { Write-Host ("    多余: {0}" -f $x) }
}

if (-not $DryRun) {
    $total = ($report | Measure-Object Bytes -Sum).Sum
    $totalMissing = ($report | Measure-Object MissingCount -Sum).Sum
    $totalExtra = ($report | Measure-Object ExtraCount -Sum).Sum
    $totalPruned = ($report | Measure-Object Pruned -Sum).Sum
    Write-Host ""
    Write-Host ("=== 素材导入完成: {0} 个分包 | 合计 {1:N1} MB（总分包上限 30MB，单包 2MB） ===" -f $report.Count, ($total/1MB))
    foreach ($r in $report) {
        $flag = if ($r.Bytes -gt 2MB) { " !! 超单包2MB" } else { " OK" }
        Write-Host ("  {0,-12} {1,3} 张  {2:N1} MB{3}" -f $r.Pkg, $r.Count, ($r.Bytes/1MB), $flag)
    }
    $verdict = if ($totalMissing -eq 0 -and $totalExtra -eq 0) { "一致" } else { "不一致" }
    Write-Host ("=== 一致性校验: 缺失 {0} | 多余 {1} | 清理 {2}     -> {3} ===" -f $totalMissing, $totalExtra, $totalPruned, $verdict)
    if ($totalMissing -eq 0 -and $totalExtra -eq 0) {
        Write-Host "✓ 产物与索引完全匹配"
    } else {
        Write-Host "✗ 存在不一致，请核对上方明细；可用 -PruneExtras 自动清理多余文件"
    }
    $json = $report | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText((Join-Path $Root "tools\import-report.json"), $json, (New-Object System.Text.UTF8Encoding($true)))
    Write-Host "报告: tools/import-report.json"
    if ($totalMissing -gt 0 -or $totalExtra -gt 0) { exit 1 }
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