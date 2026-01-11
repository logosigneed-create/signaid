@echo off
echo ========================================
echo Configuration du pare-feu pour Vite
echo ========================================
echo.
echo Ajout de la regle pour le port 3000...
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=3000

if %errorlevel% equ 0 (
    echo.
    echo [SUCCES] Regle de pare-feu ajoutee avec succes !
    echo.
    echo Vous pouvez maintenant acceder au site depuis votre smartphone :
    echo http://192.168.0.200:3000
    echo.
) else (
    echo.
    echo [ERREUR] Impossible d'ajouter la regle.
    echo Assurez-vous d'executer ce script en tant qu'administrateur.
    echo.
)

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
