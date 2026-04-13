const fs = require('fs');
const path = require('path');

const filesToRestore = [
    'src/CustomizerApp.tsx',
    'src/components/CustomizerView.tsx',
    'src/components/DesktopNavbar.tsx',
    'src/components/UniversalMenu.tsx',
    'src/components/LogoOptionsModal.tsx',
    'src/components/MobileBottomNav.tsx',
    'src/components/CartView.tsx'
];

const sourceDir = 'C:\\Partage\\Projet\\Signaid V23';
const targetDir = 'C:\\Partage\\Projet\\Signaid V24';

console.log('Restoring files from V23 to V24...');

filesToRestore.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);
    const backupPath = destPath + '.bak_march28';

    if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath)) {
            fs.copyFileSync(destPath, backupPath);
            console.log(`Backed up ${file} to ${path.basename(backupPath)}`);
        }
        fs.copyFileSync(srcPath, destPath);
        console.log(`Restored ${file}`);
    } else {
        console.log(`Source file not found: ${srcPath}`);
    }
});
console.log('Done.');
