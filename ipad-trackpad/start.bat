@echo off
title WinPad - iPad Trackpad & Tablette Windows
color 0b
cls

echo ============================================================
echo   Lancement de WinPad (iPad Trackpad & Tablette Graphique)
echo ============================================================
echo.

:: Verifier si Python est disponible
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detecte. Lancement du serveur Python ultra-fluide...
    python app.py
    goto end
)

:: Sinon verifier Node.js
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js detecte. Lancement du serveur Node.js...
    node server.js
    goto end
)

echo [ERREUR] Ni Python ni Node.js n'ont ete trouves dans votre PATH Windows.
echo Veuillez installer Python ou Node.js.
pause

:end
pause
