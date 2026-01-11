@echo off
echo ========================================
echo Demarrage du serveur Vite (Acces reseau)
echo ========================================
echo.
echo IMPORTANT: Ce serveur sera accessible depuis votre smartphone
echo Adresse locale: http://192.168.0.200:3000
echo.
echo Demarrage en cours...
echo.

npm run dev -- --host 0.0.0.0

echo.
echo Le serveur s'est arrete.
pause
