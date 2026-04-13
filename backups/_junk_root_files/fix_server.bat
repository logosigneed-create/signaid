@echo off
cls
echo ========================================================
echo   REPARATION DE SIGNAID V7 (Windows)
echo ========================================================
echo.
echo 1. Suppression des anciens fichiers (node_modules)...
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)

echo.
echo 2. Nettoyage du cache NPM...
call npm cache clean --force

echo.
echo 3. Installation des dependances (Cela peut prendre 1-2 min)...
call npm install --no-audit

echo.
echo 4. Reconstruction des binaires (esbuild)...
call npm rebuild esbuild

echo.
echo ========================================================
echo   LANCEMENT DU SERVEUR
echo ========================================================
echo.
echo URL: https://localhost:3000
echo.
echo Si le navigateur bloque (Ecran rouge/Avertissement):
echo Cliquer sur 'Avance' -> 'Continuer vers localhost (non securise)'
echo.
call npm run dev

echo.
echo ========================================================
echo   SI LE SERVEUR S'ARRETE ICI, LISEZ L'ERREUR CI-DESSUS
echo ========================================================
pause
