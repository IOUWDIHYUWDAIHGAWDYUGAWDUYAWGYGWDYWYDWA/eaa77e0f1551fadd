@echo off
title VYBot Website - Yerel Sunucu
cd /d "%~dp0"

echo.
echo  ============================================
echo    VYBot - yeniwebsite yerel sunucu
echo  ============================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    echo  Sunucu baslatiliyor: http://localhost:8080
    echo  Kapatmak icin bu pencereyi kapatin.
    echo.
    start "" "http://localhost:8080"
    python -m http.server 8080
    goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo  Sunucu baslatiliyor: http://localhost:8080
    echo  Kapatmak icin bu pencereyi kapatin.
    echo.
    start "" "http://localhost:8080"
    py -m http.server 8080
    goto :end
)

where npx >nul 2>nul
if %errorlevel%==0 (
    echo  Sunucu baslatiliyor: http://localhost:8080
    echo  Kapatmak icin bu pencereyi kapatin.
    echo.
    start "" "http://localhost:8080"
    npx --yes http-server -p 8080 -c-1
    goto :end
)

echo  HATA: Python veya Node.js bulunamadi.
echo  Lutfen Python kurun: https://www.python.org/downloads/
echo  veya Node.js kurun:  https://nodejs.org/

:end
pause
