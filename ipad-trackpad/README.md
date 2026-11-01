# 📱 WinPad - iPad Trackpad & Tablette Graphique pour Windows

Application locale client-serveur haute performance permettant de transformer un **iPad** (via Safari ou application PWA sur le réseau local Wi-Fi) en **trackpad tactile ultra-fluide** et en **tablette graphique avec support de l'Apple Pencil (pression, inclinaison et rejet de paume)** pour Windows.

---

## 🚀 Fonctionnalités Principales

### 🖱️ Mode Trackpad
- **Déplacement fluide** : Contrôle relatif du curseur avec courbe d'accélération balistique réglable.
- **Tap simple (1 doigt)** : Clic gauche instantané.
- **Tap à deux doigts** : Clic droit.
- **Défilement à deux doigts** : Défilement (scroll) vertical et horizontal fluide avec option de défilement naturel (style Mac / iOS).
- **Double-tap & glisser (Double-tap-to-drag)** : Permet de sélectionner du texte ou de déplacer une fenêtre sans maintenir un bouton enfoncé.
- **Gestes à 3 doigts** :
  - Balayage vers le haut : Affichage des tâches Windows (`Win + Tab`).
  - Balayage vers le bas : Afficher le Bureau Windows (`Win + D`).

### ✍️ Mode Tablette Graphique (Apple Pencil)
- **Positionnement absolu 1:1** : L'écran de l'iPad mappe précisément la résolution native de votre moniteur Windows (DPI-Aware).
- **Sensibilité à la pression** : Transmission continue de la pression (`event.pressure` de 0.0 à 1.0) avec jauge visuelle dynamique en temps réel.
- **Rejet de la paume (Palm Rejection)** : Lorsque la pointe de l'Apple Pencil est active, les contacts involontaires de la main ou du poignet sont automatiquement ignorés.
- **Respect du ratio d'aspect** : Cadre visuel adaptatif pour conserver les proportions exactes de l'écran PC (ex: 16:9, 16:10) sans déformation.
- **Survol (Apple Pencil Hover)** : Sur iPad Pro récents, le curseur suit la pointe du stylet avant même le contact.

### 📱 Optimisations iOS Safari & PWA
- **Zéro geste parasite** : Blocage total du rafraîchissement par tirage (pull-to-refresh), du pincement pour zoomer (pinch-to-zoom), des rebonds de défilement (overscroll) et du menu contextuel iOS.
- **Installation en PWA** : Compatible "Ajouter sur l'écran d'accueil" pour une utilisation 100% plein écran sans aucune barre d'adresse ni boutons de navigateur.
- **Faible latence & monitoring** : Communication WebSocket locale ultra-rapide (< 3 ms) avec affichage continu de la latence Ping / Pong.
- **Reconnexion automatique** : Reconnexion instantanée si l'iPad se met en veille ou change de réseau.
- **Tiroir de raccourcis Windows** : Accès rapide aux touches `Ctrl+Z`, `Ctrl+C`, `Ctrl+V`, `Ctrl+S`, `Win`, `Echap`, `Entrée`, etc.

---

## 📦 Structure du Projet

```
ipad-trackpad/
├── app.py              # Serveur Python (FastAPI + WebSocket + Win32 ctypes DPI-aware)
├── server.js           # Serveur Node.js alternatif (Express + ws + koffi Win32 FFI)
├── requirements.txt    # Dépendances Python
├── package.json        # Dépendances Node.js
├── start.bat           # Lanceur Windows en 1 clic
├── allow_firewall.bat  # Script d'autorisation du Pare-feu Windows (port 5000)
├── static/             # Frontend Web Client
│   ├── index.html      # Interface HTML5 PWA responsive
│   ├── style.css       # Thème OLED sombre & styles tactiles
│   ├── app.js          # Moteur Pointer Events, gestes & WebSocket
│   ├── manifest.json   # Manifeste PWA pour iOS Safari
│   └── icon.svg        # Icône haute définition
└── README.md           # Documentation
```

---

## ⚡ Démarrage Rapide

### Option A : Lancement via Python (Recommandé)

1. **Installation des dépendances** (une seule fois) :
   ```bash
   pip install -r requirements.txt
   ```

2. **Démarrage du serveur** :
   ```bash
   python app.py
   ```
   *(Ou double-cliquez simplement sur `start.bat`)*

3. Le terminal affiche l'URL locale ainsi qu'un **QR Code ASCII** :
   ```text
   ==============================================================
    📱  IPAD TRACKPAD & TABLETTE GRAPHIQUE POUR WINDOWS
   ==============================================================
     ⚡ Statut     : Serveur actif et en ecoute
     👉 URL iPad   : http://192.168.0.200:5000
     💻 Localhost  : http://localhost:5000
   --------------------------------------------------------------
     📷 Scannez ce QR Code avec l'appareil photo de votre iPad :
     [QR CODE ASCII]
   ==============================================================
   ```

---

### Option B : Lancement via Node.js

1. **Installation des dépendances** (une seule fois) :
   ```bash
   npm install
   ```

2. **Démarrage du serveur** :
   ```bash
   npm start
   ```

---

## 📲 Connexion depuis l'iPad

1. Assurez-vous que l'iPad et votre PC sont connectés au **même réseau Wi-Fi**.
2. Ouvrez l'appareil photo de l'iPad et **scannez le QR Code** affiché dans votre terminal Windows, ou saisissez l'adresse dans **Safari** (ex: `http://192.168.0.200:5000`).
3. **Pour une expérience plein écran optimale (PWA)** :
   - Dans Safari sur l'iPad, appuyez sur le bouton **Partager** (icône carré avec flèche vers le haut).
   - Faites défiler et touchez **Sur l'écran d'accueil**.
   - Nommez l'icône **WinPad** et validez.
   - Lancez ensuite WinPad depuis l'écran d'accueil de votre iPad !

---

## 🛡️ Pare-feu Windows (Si la page ne charge pas sur l'iPad)

Si Safari sur l'iPad indique qu'il ne peut pas se connecter au serveur, le pare-feu de Windows bloque probablement les connexions entrantes sur le port 5000.

### Méthode 1 (Automatique)
Faites un clic droit sur `allow_firewall.bat` et sélectionnez **Exécuter en tant qu'administrateur**.

### Méthode 2 (Manuelle via PowerShell en Administrateur)
Ouvrez PowerShell en tant qu'administrateur et exécutez la commande suivante :
```powershell
New-NetFirewallRule -DisplayName "WinPad iPad Server (Port 5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```
*(Ou via l'invite de commande cmd)* :
```cmd
netsh advfirewall firewall add rule name="WinPad iPad Server (Port 5000)" dir=in action=allow protocol=TCP localport=5000 profile=any
```

---

## ⚙️ Paramètres Personnalisables dans l'Application

Appuyez sur l'icône **⚙️ (Paramètres)** en haut à droite de l'écran de l'iPad pour ajuster :
- **Sensibilité du curseur** : De `0.5x` à `3.0x`.
- **Accélération balistique** : Active/désactive l'inertie de vitesse pour les mouvements rapides.
- **Défilement naturel** : Inversion de l'axe de défilement (style Apple / macOS).
- **Vitesse de défilement** : Réglage précis de la sensibilité du scroll à 2 doigts.
- **Ratio d'aspect Windows** : Conserve la proportion exacte du moniteur de votre PC en mode tablette graphique.
- **Seuil de pression minimale Apple Pencil** : Évite les traits involontaires lors d'effleurements très légers.

---

## 🛠️ Dépannage
- **L'iPad ne charge pas l'URL** : Vérifiez que votre réseau Wi-Fi n'est pas configuré en mode "Invité / Isolation AP" (certaines box bloquent la communication directe entre appareils connectés au Wi-Fi).
- **Mode veille de l'iPad** : Si vous verrouillez l'iPad puis le déverrouillez, l'application se reconnecte automatiquement en moins d'une seconde.
