Add-Type -AssemblyName System.Drawing

$sourcePath = "d:\Projetos\supercanvas\public\favicon.png"
$resBase = "d:\Projetos\supercanvas\android\app\src\main\res"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source icon not found at $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0E0E16")

# 1. Launcher Icons in mipmap directories
$mipmapConfigs = @(
    @{ Folder = "mipmap-mdpi"; LegacySize = 48; ForegroundSize = 108 },
    @{ Folder = "mipmap-hdpi"; LegacySize = 72; ForegroundSize = 162 },
    @{ Folder = "mipmap-xhdpi"; LegacySize = 96; ForegroundSize = 216 },
    @{ Folder = "mipmap-xxhdpi"; LegacySize = 144; ForegroundSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; LegacySize = 192; ForegroundSize = 432 }
)

foreach ($cfg in $mipmapConfigs) {
    $dir = Join-Path $resBase $cfg.Folder
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # 1.1 ic_launcher_foreground.png (Adaptive Icon Foreground, 108dp canvas, ~66% safe logo area)
    $fgSize = $cfg.ForegroundSize
    $fgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($fgBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $logoSize = [math]::Round($fgSize * 0.66)
    $offset = [math]::Round(($fgSize - $logoSize) / 2)
    $g.DrawImage($sourceImg, $offset, $offset, $logoSize, $logoSize)
    $g.Dispose()

    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    if (Test-Path $fgPath) { Remove-Item $fgPath -Force }
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    # 1.2 ic_launcher.png (Legacy Square with filled dark background and centered logo)
    $legSize = $cfg.LegacySize
    $legBmp = New-Object System.Drawing.Bitmap($legSize, $legSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($legBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($bgColor)

    $legLogoSize = [math]::Round($legSize * 0.74)
    $legOffset = [math]::Round(($legSize - $legLogoSize) / 2)
    $g.DrawImage($sourceImg, $legOffset, $legOffset, $legLogoSize, $legLogoSize)
    $g.Dispose()

    $legPath = Join-Path $dir "ic_launcher.png"
    if (Test-Path $legPath) { Remove-Item $legPath -Force }
    $legBmp.Save($legPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $legBmp.Dispose()

    # 1.3 ic_launcher_round.png (Legacy Round with circular dark background)
    $rndBmp = New-Object System.Drawing.Bitmap($legSize, $legSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($rndBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillEllipse($brush, 0, 0, $legSize - 1, $legSize - 1)
    $brush.Dispose()

    $rndLogoSize = [math]::Round($legSize * 0.68)
    $rndOffset = [math]::Round(($legSize - $rndLogoSize) / 2)
    $g.DrawImage($sourceImg, $rndOffset, $rndOffset, $rndLogoSize, $rndLogoSize)
    $g.Dispose()

    $rndPath = Join-Path $dir "ic_launcher_round.png"
    if (Test-Path $rndPath) { Remove-Item $rndPath -Force }
    $rndBmp.Save($rndPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $rndBmp.Dispose()
}

Write-Host "Launcher mipmap icons generated successfully."

# 2. Splash screens in drawable directories
$splashFiles = Get-ChildItem -Path $resBase -Recurse -Filter "splash.png"

foreach ($file in $splashFiles) {
    # Get current dimensions
    $tempImg = [System.Drawing.Image]::FromFile($file.FullName)
    $targetW = $tempImg.Width
    $targetH = $tempImg.Height
    $tempImg.Dispose()

    $splashBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($splashBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($bgColor)

    # Scale logo nicely (about 25% of min dimension, min 96px)
    $minDim = [math]::Min($targetW, $targetH)
    $splashLogoSize = [math]::Max([math]::Round($minDim * 0.32), 96)
    $splashLogoSize = [math]::Min($splashLogoSize, [math]::Round($minDim * 0.8))

    $offsetX = [math]::Round(($targetW - $splashLogoSize) / 2)
    $offsetY = [math]::Round(($targetH - $splashLogoSize) / 2)

    $g.DrawImage($sourceImg, $offsetX, $offsetY, $splashLogoSize, $splashLogoSize)
    $g.Dispose()

    Remove-Item $file.FullName -Force
    $splashBmp.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $splashBmp.Dispose()
}

Write-Host "Splash screens generated successfully."
$sourceImg.Dispose()
