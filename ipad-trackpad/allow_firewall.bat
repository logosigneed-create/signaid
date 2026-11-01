@echo off
title Configuration Pare-feu Windows - WinPad (Port 5000)
color 0a
cls

echo ===================================================================
echo   Autorisation du port 5000 dans le Pare-feu Windows pour l'iPad
echo ===================================================================
echo.
echo Ce script configure une regle entrante pour le port TCP 5000.
echo Note: Executez ce fichier en tant qu'Administrateur si necessaire.
echo.

netsh advfirewall firewall show rule name="WinPad iPad Server (Port 5000)" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] La regle existe deja dans le Pare-feu.
) else (
    echo [INFO] Creation de la regle dans le Pare-feu Windows...
    netsh advfirewall firewall add rule name="WinPad iPad Server (Port 5000)" dir=in action=allow protocol=TCP localport=5000 profile=any
    if %errorlevel% equ 0 (
        echo [SUCCES] Regle Pare-feu creee avec succes !
    ) else (
        echo [ATTENTION] Impossible d'ajouter la regle automatiquement.
        echo             Veuillez faire un clic droit sur ce fichier et
        echo             choisir "Executer en tant qu'administrateur".
    )
)

echo.
echo ===================================================================
pause
