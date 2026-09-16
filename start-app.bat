@echo off
title "Harada and Avra Life OS - Better Future 2030"
echo ============================================================
echo   HARADA AND AVRA - LIFE OS (LARK BASE WORKSPACE)
echo   Target: 100.000 Siswa - 1.000 Sekolah - Mandat 2030
echo ============================================================
echo.

cd /d "%~dp0app"

if not exist "node_modules" (
    echo [INFO] Menginstal dependensi pertama kali... Harap tunggu sebentar.
    call npm install
)

echo.
echo [INFO] Menjalankan server aplikasi...
echo [INFO] Browser akan terbuka otomatis di http://localhost:5173
echo.
call npx vite --open --host 127.0.0.1 --port 5173
pause
