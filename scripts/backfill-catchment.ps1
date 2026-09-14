param(
  [switch]$Write,
  [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Net.Http

$pbUrl = 'https://raych-pocketbase.fly.dev'
$tileUrl = 'https://raw.githubusercontent.com/wiwari/accTW/2ebf55488dd2e445d495df02e5fbf746b742e77a/dist/acc/{0}/{1}/{2}.png'
$zoom = 14
$http = [System.Net.Http.HttpClient]::new()
$tiles = @{}

function Decode-Catchment([int]$r, [int]$g, [int]$b) {
  $raw = ($r -shl 16) + ($g -shl 8) + $b
  if ($raw -eq 0x800000) { return $null }
  if ($raw -gt 0x800000) { $raw -= 0x1000000 }
  return [math]::Round($raw * 0.1 - 10000, 1)
}

function Get-TilePoint([double]$lat, [double]$lon) {
  $n = [math]::Pow(2, $zoom)
  $x = ($lon + 180) / 360 * $n
  $radians = $lat * [math]::PI / 180
  $mercator = [math]::Log([math]::Tan($radians) + 1 / [math]::Cos($radians))
  $y = (1 - $mercator / [math]::PI) / 2 * $n
  return @{
    TileX = [math]::Floor($x)
    TileY = [math]::Floor($y)
    PixelX = [math]::Floor(($x - [math]::Floor($x)) * 256)
    PixelY = [math]::Floor(($y - [math]::Floor($y)) * 256)
  }
}

function Get-Catchment([double]$lat, [double]$lon) {
  $point = Get-TilePoint $lat $lon
  $key = "$($point.TileX)/$($point.TileY)"
  if (-not $tiles.ContainsKey($key)) {
    $url = $tileUrl -f $zoom, $point.TileX, $point.TileY
    try {
      $bytes = $http.GetByteArrayAsync($url).Result
      $stream = [IO.MemoryStream]::new($bytes)
      $tiles[$key] = [Drawing.Bitmap]::new($stream)
      $stream.Dispose()
    } catch {
      $tiles[$key] = $null
    }
  }
  $bitmap = $tiles[$key]
  if ($null -eq $bitmap) { return $null }
  $color = $bitmap.GetPixel($point.PixelX, $point.PixelY)
  return Decode-Catchment $color.R $color.G $color.B
}

function Parse-Gps([string]$gps) {
  if ([string]::IsNullOrWhiteSpace($gps)) { return $null }
  $parts = $gps.Trim() -split '[,\s]+' | ForEach-Object { [double]$_ }
  if ($parts.Count -lt 2 -or [math]::Abs($parts[0]) -gt 90 -or [math]::Abs($parts[1]) -gt 180) { return $null }
  return @{ Lat = $parts[0]; Lon = $parts[1] }
}

function Get-SamplePoints($route) {
  if ($route.gpx_waypoints) {
    try {
      $decoded = ConvertFrom-Json -InputObject $route.gpx_waypoints
      $points = @(foreach ($waypoint in $decoded) {
        if ($null -ne $waypoint.lat -and $null -ne $waypoint.lon) { @{ Lat = [double]$waypoint.lat; Lon = [double]$waypoint.lon } }
      })
      if ($points.Count) { return @{ Method = 'waypoint max'; Points = $points } }
    } catch { Write-Warning "Waypoint parse failed for $($route.id): $($_.Exception.Message)" }
  }
  $gps = Parse-Gps $route.gps
  if ($gps) { return @{ Method = 'single GPS'; Points = @($gps) } }
  return $null
}

function Test-Script {
  if ((Decode-Catchment 1 134 160) -ne 0) { throw 'RGB decoder failed at 0 km2' }
  if ((Decode-Catchment 1 134 161) -ne 0.1) { throw 'RGB decoder failed at 0.1 km2' }
  $point = Get-TilePoint 24.843839 121.457062
  if ($point.TileX -ne 13719 -or $point.TileY -ne 7024 -or $point.PixelX -ne 165 -or $point.PixelY -ne 35) {
    throw 'Web Mercator tile conversion failed'
  }
  Write-Host 'Self-test passed'
}

if ($SelfTest) {
  Test-Script
  $http.Dispose()
  exit
}

$fields = 'id,name,type,gps,gpx_waypoints,catchment_km2,catchment_sampled,catchment_gps'
$routes = @((Invoke-RestMethod "$pbUrl/api/collections/canyon_routes/records?perPage=500&fields=$fields").items | Where-Object { $_.type })
$results = foreach ($route in $routes) {
  $samples = Get-SamplePoints $route
  if (-not $samples) {
    [pscustomobject]@{ Id = $route.id; Name = $route.name -replace "`n", ' '; Method = 'no coordinates'; Samples = 0; CatchmentKm2 = $null; CatchmentGps = $null }
    continue
  }

  $measurements = @($samples.Points | ForEach-Object {
    $value = Get-Catchment $_.Lat $_.Lon
    if ($null -ne $value -and $value -ge 0) { [pscustomobject]@{ Value = $value; Lat = $_.Lat; Lon = $_.Lon } }
  })
  $best = $measurements | Sort-Object Value -Descending | Select-Object -First 1
  [pscustomobject]@{
    Id = $route.id
    Name = $route.name -replace "`n", ' '
    Method = $samples.Method
    Samples = $samples.Points.Count
    CatchmentKm2 = if ($best) { $best.Value } else { $null }
    CatchmentGps = if ($best) { "$($best.Lat),$($best.Lon)" } else { $null }
  }
}

$results | Sort-Object @{ Expression = 'CatchmentKm2'; Descending = $true } | Format-Table Name, Method, Samples, CatchmentKm2 -AutoSize
$sampled = @($results | Where-Object { $null -ne $_.CatchmentKm2 })
Write-Host "`nRoutes: $($routes.Count), sampled: $($sampled.Count), unavailable: $($routes.Count - $sampled.Count)"

if ($Write) {
  if (-not $env:PB_EMAIL -or -not $env:PB_PASSWORD) { throw 'PB_EMAIL and PB_PASSWORD are required with -Write' }
  $auth = Invoke-RestMethod "$pbUrl/api/collections/_superusers/auth-with-password" -Method Post -ContentType 'application/json' -Body (@{
    identity = $env:PB_EMAIL
    password = $env:PB_PASSWORD
  } | ConvertTo-Json)
  $headers = @{ Authorization = $auth.token }
  $collection = Invoke-RestMethod "$pbUrl/api/collections/canyon_routes" -Headers $headers
  $fieldCount = $collection.fields.Count
  if (-not ($collection.fields | Where-Object name -eq 'catchment_km2')) { $collection.fields += @{ name = 'catchment_km2'; type = 'number'; required = $false; hidden = $false; presentable = $false; min = 0; max = $null; onlyInt = $false; noDecimal = $false } }
  if (-not ($collection.fields | Where-Object name -eq 'catchment_sampled')) { $collection.fields += @{ name = 'catchment_sampled'; type = 'bool'; required = $false; hidden = $false; presentable = $false } }
  if (-not ($collection.fields | Where-Object name -eq 'catchment_gps')) { $collection.fields += @{ name = 'catchment_gps'; type = 'text'; required = $false; hidden = $false; presentable = $false; max = 0; min = 0; pattern = '' } }
  if ($collection.fields.Count -ne $fieldCount) {
    Invoke-RestMethod "$pbUrl/api/collections/$($collection.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{ fields = $collection.fields } | ConvertTo-Json -Depth 20) | Out-Null
  }
  foreach ($result in $sampled) {
    $body = @{ catchment_km2 = $result.CatchmentKm2; catchment_sampled = $true; catchment_gps = $result.CatchmentGps }
    Invoke-RestMethod "$pbUrl/api/collections/canyon_routes/records/$($result.Id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json) | Out-Null
  }
  Write-Host "Updated $($sampled.Count) records"
}

foreach ($bitmap in $tiles.Values) { if ($null -ne $bitmap) { $bitmap.Dispose() } }
$http.Dispose()
