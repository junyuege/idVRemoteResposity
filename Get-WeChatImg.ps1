<#
.SYNOPSIS
    从微信公众号文章下载原图
.DESCRIPTION
    抓取 mp.weixin.qq.com 文章页面，提取缩略图 URL 并转为原图尺寸，依次下载到本地。
    支持续接编号：已存在的 img_XXX.jpg 会自动跳过，新图从最大编号+1 开始。
.PARAMETER Url
    文章完整 URL，例如 https://mp.weixin.qq.com/s/xxxxx
.PARAMETER OutputDir
    输出目录名，默认为 downloaded_imgs2
.EXAMPLE
    .\Get-WeChatImg.ps1 "https://mp.weixin.qq.com/s/xxxxx"
    .\Get-WeChatImg.ps1 "https://mp.weixin.qq.com/s/xxxxx" -OutputDir "my_images"
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Url,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "downloaded_imgs2"
)

$headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Referer"    = "https://mp.weixin.qq.com/"
}

# ── Step 1: 下载页面 ─────────────────────────────────────────────
Write-Host "[1/5] 正在获取页面..." -ForegroundColor Cyan
$tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
try {
    Invoke-WebRequest -Uri $Url -Headers $headers -OutFile $tempHtml -ErrorAction Stop
} catch {
    Write-Error "页面下载失败: $_"
    exit 1
}

# ── Step 2: 提取图片 URL ─────────────────────────────────────────
Write-Host "[2/5] 提取图片 URL..." -ForegroundColor Cyan
$html = Get-Content -Path $tempHtml -Raw
$pattern = 'https://(?:sz_)?mmbiz\.qpic\.cn/(?:sz_)?mmbiz_(?:jpg|png)/[^/]+/[^/]+/640\?wx_fmt=(?:jpeg|png)'
$matches = [regex]::Matches($html, $pattern) | ForEach-Object { $_.Value }
Write-Host "  找到 $($matches.Count) 张图片" -ForegroundColor Yellow

if ($matches.Count -eq 0) {
    Write-Warning "未匹配到任何图片 URL，请检查文章页面是否包含 mmbiz.qpic.cn 图片。"
    Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
    exit 0
}

# ── Step 3: 去重 + 转原图 ────────────────────────────────────────
Write-Host "[3/5] 转为原图尺寸并去重..." -ForegroundColor Cyan
$uniqueUrls = $matches | ForEach-Object { $_ -replace '/640', '/0' } | Select-Object -Unique
Write-Host "  去重后 $($uniqueUrls.Count) 张原图" -ForegroundColor Yellow

# ── Step 4: 编号续接 ─────────────────────────────────────────────
Write-Host "[4/5] 准备输出目录..." -ForegroundColor Cyan
$outputPath = Join-Path -Path (Get-Location) -ChildPath $OutputDir
if (-not (Test-Path -Path $outputPath)) {
    $null = New-Item -Path $outputPath -ItemType Directory -Force
    $nextNumber = 1
} else {
    $existingNumbers = Get-ChildItem -Path $outputPath -Filter "img_*.jpg" |
        ForEach-Object {
            if ($_.BaseName -match 'img_(\d+)') {
                [int]$matches[1]
            }
        }
    $nextNumber = if ($existingNumbers) {
        ($existingNumbers | Measure-Object -Maximum).Maximum + 1
    } else {
        1
    }
}
Write-Host "  从 img_$( '{0:D3}' -f $nextNumber ) 开始编号" -ForegroundColor Yellow

# ── Step 5: 批量下载 ─────────────────────────────────────────────
Write-Host "[5/5] 下载图片..." -ForegroundColor Cyan
$downloaded = 0
$failed = 0
foreach ($url in $uniqueUrls) {
    $filename = "img_{0:D3}.jpg" -f $nextNumber
    $filepath = Join-Path -Path $outputPath -ChildPath $filename
    try {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $filepath -ErrorAction Stop
        Write-Host "  [OK] $filename" -ForegroundColor Green
        $downloaded++
    } catch {
        Write-Host "  [FAIL] $filename : $_" -ForegroundColor Red
        $failed++
    }
    $nextNumber++
}

# 清理临时文件
Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue

# ── 汇总 ─────────────────────────────────────────────────────────
Write-Host "`n完成。成功: $downloaded, 失败: $failed, 总计: $($uniqueUrls.Count)" -ForegroundColor Cyan
