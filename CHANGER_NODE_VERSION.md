# 🔧 Guide Rapide : Changer la Version Node.js

## ⚠️ Problème Actuel
Vous avez Node.js 20 installé, mais Windows utilise encore Node.js 24.

## ✅ Solution : Désinstaller Node.js 24

### Méthode 1 : Via Paramètres Windows (RECOMMANDÉ)

1. Appuyez sur **Windows + I** (Paramètres)
2. Allez dans **Applications** → **Applications installées**
3. Cherchez **"Node.js"**
4. Vous devriez voir **deux versions** :
   - Node.js v24.x.x
   - Node.js v20.x.x (LTS)
5. Cliquez sur **Node.js v24** → **Désinstaller**
6. **Conservez** Node.js v20

### Méthode 2 : Via PowerShell (Admin)

```powershell
# Vérifier les versions installées
where.exe node

# Désinstaller via Chocolatey (si installé avec choco)
choco uninstall nodejs
```

## 🎯 Après la désinstallation

1. **Fermez TOUS les terminaux** (PowerShell, CMD, etc.)
2. **Rouvrez un nouveau terminal**
3. Vérifiez :
   ```bash
   node --version
   ```
   → Devrait afficher **v20.x.x**

4. Ensuite dans votre projet :
   ```bash
   cd "c:\Partage\Projet\Signaid V7"
   npm install
   npm run dev
   ```

Le widget s'affichera sur **localhost:5173** ! 🎉
