<#
.SYNOPSIS
    微信公众号文章图片下载工具（图形界面版）
.DESCRIPTION
    基于 Get-WeChatImg.ps1 核心逻辑的 WinForms 图形界面版本。
    支持 URL 输入、目录选择、进度展示、编号续接。
#>

# ── 加载 WinForms 程序集 ─────────────────────────────────────────
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── 主窗体 ───────────────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.Text = "微信公众号图片下载工具"
$form.Size = New-Object System.Drawing.Size(660, 520)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon((Get-Process -Id $pid).Path)

# ── 字体 ─────────────────────────────────────────────────────────
$fontNormal = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)
$fontBold   = New-Object System.Drawing.Font("Microsoft YaHei UI", 9, [System.Drawing.FontStyle]::Bold)

# ── URL 输入 ─────────────────────────────────────────────────────
$lblUrl = New-Object System.Windows.Forms.Label
$lblUrl.Text = "文章 URL："
$lblUrl.Location = New-Object System.Drawing.Point(14, 18)
$lblUrl.Size = New-Object System.Drawing.Size(70, 22)
$lblUrl.Font = $fontBold

$txtUrl = New-Object System.Windows.Forms.TextBox
$txtUrl.Location = New-Object System.Drawing.Point(84, 16)
$txtUrl.Size = New-Object System.Drawing.Size(550, 22)
$txtUrl.Font = $fontNormal
$txtUrl.Text = "https://mp.weixin.qq.com/s/"

# ── 输出目录 ─────────────────────────────────────────────────────
$lblDir = New-Object System.Windows.Forms.Label
$lblDir.Text = "输出目录："
$lblDir.Location = New-Object System.Drawing.Point(14, 52)
$lblDir.Size = New-Object System.Drawing.Size(70, 22)
$lblDir.Font = $fontBold

$txtDir = New-Object System.Windows.Forms.TextBox
$txtDir.Location = New-Object System.Drawing.Point(84, 50)
$txtDir.Size = New-Object System.Drawing.Size(465, 22)
$txtDir.Font = $fontNormal
$txtDir.Text = "downloaded_imgs2"

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "浏览..."
$btnBrowse.Location = New-Object System.Drawing.Point(555, 49)
$btnBrowse.Size = New-Object System.Drawing.Size(79, 26)
$btnBrowse.Font = $fontNormal
$btnBrowse.UseVisualStyleBackColor = $true
$btnBrowse.Add_Click({
    $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderBrowser.Description = "选择图片保存目录"
    if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $txtDir.Text = $folderBrowser.SelectedPath
    }
})

# ── 开始按钮 ─────────────────────────────────────────────────────
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "开始下载"
$btnStart.Location = New-Object System.Drawing.Point(270, 86)
$btnStart.Size = New-Object System.Drawing.Size(120, 34)
$btnStart.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 10, [System.Drawing.FontStyle]::Bold)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.UseVisualStyleBackColor = $false
$btnStart.Cursor = [System.Windows.Forms.Cursors]::Hand

# ── 进度条 ───────────────────────────────────────────────────────
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(14, 130)
$progressBar.Size = New-Object System.Drawing.Size(620, 20)
$progressBar.Style = "Continuous"
$progressBar.Visible = $false

# ── 日志输出框 ───────────────────────────────────────────────────
$txtLog = New-Object System.Windows.Forms.RichTextBox
$txtLog.Location = New-Object System.Drawing.Point(14, 160)
$txtLog.Size = New-Object System.Drawing.Size(620, 280)
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$txtLog.ReadOnly = $true
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
$txtLog.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

# ── 状态栏 ───────────────────────────────────────────────────────
$statusStrip = New-Object System.Windows.Forms.StatusStrip
$statusLabel = New-Object System.Windows.Forms.ToolStripStatusLabel
$statusLabel.Text = "就绪"
$statusStrip.Items.Add($statusLabel)
$form.Controls.Add($statusStrip)

# ── 日志辅助函数 ─────────────────────────────────────────────────
function Write-Log {
    param([string]$Text, [string]$Color = "Silver")
    $colorMap = @{
        "Cyan"   = [System.Drawing.Color]::Cyan
        "Green"  = [System.Drawing.Color]::LimeGreen
        "Red"    = [System.Drawing.Color]::IndianRed
        "Yellow" = [System.Drawing.Color]::Gold
        "Silver" = [System.Drawing.Color]::Silver
    }
    $c = $colorMap[$Color]
    if (-not $c) { $c = [System.Drawing.Color]::Silver }
    $txtLog.SelectionStart = $txtLog.TextLength
    $txtLog.SelectionLength = 0
    $txtLog.SelectionColor = $c
    $txtLog.AppendText("$Text`r`n")
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Set-Status {
    param([string]$Text)
    $statusLabel.Text = $Text
    [System.Windows.Forms.Application]::DoEvents()
}

# ── 核心下载逻辑 ─────────────────────────────────────────────────
function Start-Download {
    param([string]$Url, [string]$OutputDir)
    $headers = @{
        "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        "Referer"    = "https://mp.weixin.qq.com/"
    }
    Set-Status "正在获取页面..."
    Write-Log "[1/5] 正在获取页面..." Cyan
    $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
    try {
        Invoke-WebRequest -Uri $Url -Headers $headers -OutFile $tempHtml -ErrorAction Stop
    } catch {
        Write-Log "页面下载失败: $_" Red
        Set-Status "下载失败"
        return
    }
    Set-Status "提取图片 URL..."
    Write-Log "[2/5] 提取图片 URL..." Cyan
    $html = Get-Content -Path $tempHtml -Raw
    $pattern = 'https://(?:sz_)?mmbiz\.qpic\.cn/(?:sz_)?mmbiz_(?:jpg|png)/[^/]+/[^/]+/640\?wx_fmt=(?:jpeg|png)'
    $matches = [regex]::Matches($html, $pattern) | ForEach-Object { $_.Value }
    Write-Log "  找到 $($matches.Count) 张图片" Yellow
    if ($matches.Count -eq 0) {
        Write-Log "未匹配到任何图片 URL，请检查文章页面是否包含 mmbiz.qpic.cn 图片。" Yellow
        Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
        Set-Status "未找到图片"
        return
    }
    Set-Status "转为原图并去重..."
    Write-Log "[3/5] 转为原图尺寸并去重..." Cyan
    $uniqueUrls = $matches | ForEach-Object { $_ -replace '/640', '/0' } | Select-Object -Unique
    Write-Log "  去重后 $($uniqueUrls.Count) 张原图" Yellow
    Set-Status "准备输出目录..."
    Write-Log "[4/5] 准备输出目录..." Cyan
    if (-not (Test-Path -Path $OutputDir)) {
        $null = New-Item -Path $OutputDir -ItemType Directory -Force
        $nextNumber = 1
    } else {
        $existingNumbers = Get-ChildItem -Path $OutputDir -Filter "img_*.jpg" |
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
    Write-Log "  从 img_$( '{0:D3}' -f $nextNumber ) 开始编号" Yellow
    Set-Status "下载图片..."
    Write-Log "[5/5] 下载图片..." Cyan
    $downloaded = 0
    $failed = 0
    $total = $uniqueUrls.Count
    $progressBar.Visible = $true
    $progressBar.Maximum = $total
    $progressBar.Value = 0
    foreach ($url in $uniqueUrls) {
        $filename = "img_{0:D3}.jpg" -f $nextNumber
        $filepath = Join-Path -Path $OutputDir -ChildPath $filename
        try {
            Invoke-WebRequest -Uri $url -Headers $headers -OutFile $filepath -ErrorAction Stop
            Write-Log "  [OK] $filename" Green
            $downloaded++
        } catch {
            Write-Log "  [FAIL] $filename : $_" Red
            $failed++
        }
        $nextNumber++
        $progressBar.Value++
        Set-Status "下载中... $downloaded / $total"
    }
    Remove-Item -Path $tempHtml -Force -ErrorAction SilentlyContinue
    Write-Log "完成。成功: $downloaded, 失败: $failed, 总计: $total" Cyan
    Set-Status "完成 - 成功: $downloaded, 失败: $failed"
    $progressBar.Visible = $false
    $btnStart.Enabled = $true
}

# ── 按钮事件 ─────────────────────────────────────────────────────
$btnStart.Add_Click({
    $url = $txtUrl.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($url) -or $url -eq "https://mp.weixin.qq.com/s/") {
        [System.Windows.Forms.MessageBox]::Show("请输入有效的文章 URL", "提示",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }
    $dir = $txtDir.Text.Trim()
    if ([string]::IsNullOrWhiteSpace($dir)) {
        $dir = "downloaded_imgs2"
    }
    $btnStart.Enabled = $false
    $txtLog.Clear()
    Start-Download -Url $url -OutputDir $dir
})

# ── 组装控件 ─────────────────────────────────────────────────────
$form.Controls.AddRange(@(
    $lblUrl, $txtUrl,
    $lblDir, $txtDir, $btnBrowse,
    $btnStart,
    $progressBar,
    $txtLog
))

# ── 显示窗体 ─────────────────────────────────────────────────────
$form.ShowDialog() | Out-Null