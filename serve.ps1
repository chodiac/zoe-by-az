# Simple, resilient static file server for local preview.
# Usage:  ./serve.ps1   ->   http://localhost:5178
#
# Single-threaded but exception-proof: it never dies on a client
# disconnect. For production use any real static host (nginx, Netlify,
# Vercel, GitHub Pages, ...). The files are plain static assets.
param([int]$Port = 5178)

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$mime = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".js"="text/javascript; charset=utf-8"; ".mjs"="text/javascript; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".webmanifest"="application/manifest+json; charset=utf-8";
  ".mp4"="video/mp4"; ".webm"="video/webm";
  ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".png"="image/png";
  ".webp"="image/webp"; ".gif"="image/gif"; ".svg"="image/svg+xml";
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ico"="image/x-icon"; ".txt"="text/plain; charset=utf-8"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "ZOE by AZ -> http://localhost:$Port/  (Ctrl+C to stop)"

while ($listener.IsListening) {
  $ctx = $null
  try { $ctx = $listener.GetContext() } catch { continue }
  try {
    $ctx.Response.KeepAlive = $false
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $rel  = $rel -replace '/', [IO.Path]::DirectorySeparatorChar
    $file = [IO.Path]::GetFullPath((Join-Path $root $rel))

    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers['Cache-Control'] = 'no-store'
      $bytes = [IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes("404 - $rel")
      $ctx.Response.ContentLength64 = $b.Length
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    }
  } catch {
  } finally {
    if ($ctx) { try { $ctx.Response.OutputStream.Close(); $ctx.Response.Close() } catch {} }
  }
}
