# Рисует icon-512.png и icon-192.png (System.Drawing, без установки программ).
# Запуск: powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
param([string]$OutDir = (Split-Path $PSScriptRoot -Parent))
Add-Type -AssemblyName System.Drawing

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw([int]$size, [string]$file){
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $k = $size / 512.0

  # Фон — как у прежней иконки: скруглённый квадрат, тёмно-синий градиент
  $bg = RoundRect 0 0 $size $size (96 * $k)
  $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
    [System.Drawing.ColorTranslator]::FromHtml("#13294B"), [System.Drawing.ColorTranslator]::FromHtml("#0B1D33"), 90)
  $g.FillPath($grad, $bg)

  $gold = [System.Drawing.ColorTranslator]::FromHtml("#D4AF6A")
  $goldDim = [System.Drawing.Color]::FromArgb(150, $gold)
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $dimBrush = New-Object System.Drawing.SolidBrush($goldDim)

  # Рисунок уменьшен к центру — в безопасной зоне маскируемой иконки
  $g.TranslateTransform((256 * $k), (262 * $k))
  $g.ScaleTransform(0.86, 0.86)
  $g.TranslateTransform((-256 * $k), (-238 * $k))

  # Три растущих столбика
  $base = 384 * $k; $bw = 62 * $k; $gap = 26 * $k; $x0 = 150 * $k
  $heights = @(70, 120, 170)
  for($i = 0; $i -lt 3; $i++){
    $h = $heights[$i] * $k
    $x = $x0 + $i * ($bw + $gap)
    $bar = RoundRect $x ($base - $h) $bw $h (12 * $k)
    if($i -eq 2){ $g.FillPath($goldBrush, $bar) } else { $g.FillPath($dimBrush, $bar) }
  }

  # Линия роста со стрелкой
  $pen = New-Object System.Drawing.Pen($gold, (22 * $k))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pts = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF((132 * $k), (238 * $k))),
    (New-Object System.Drawing.PointF((208 * $k), (172 * $k))),
    (New-Object System.Drawing.PointF((266 * $k), (208 * $k))),
    (New-Object System.Drawing.PointF((352 * $k), (124 * $k))))
  $g.DrawLines($pen, $pts)
  # Наконечник стрелки по направлению последнего отрезка
  $tip = New-Object System.Drawing.PointF((384 * $k), (92 * $k))
  $head = New-Object System.Drawing.Drawing2D.GraphicsPath
  $head.AddPolygon([System.Drawing.PointF[]]@($tip,
    (New-Object System.Drawing.PointF((380 * $k), (164 * $k))),
    (New-Object System.Drawing.PointF((312 * $k), (96 * $k)))))
  $g.FillPath($goldBrush, $head)

  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw 512 (Join-Path $OutDir "icon-512.png")
Draw 192 (Join-Path $OutDir "icon-192.png")
"ok"
