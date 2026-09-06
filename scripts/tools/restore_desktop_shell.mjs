import fs from 'fs';
import path from 'path';

const filesToRestore = [
    'src/CustomizerApp.tsx',
    'src/components/DesktopNavbar.tsx',
    'src/components/UniversalMenu.tsx'
];

const sourceDir = 'C:\\Partage\\Projet\\Signaid V23';
const targetDir = 'C:\Partage\Projet\signaid-studio';

console.log('Restoring DESKTOP Interface files from V23 to V24...');

filesToRestore.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);
    const backupPath = destPath + '.bak_desktoponly';

    if (fs.existsSync(srcPath)) {
        if (fs.existsSync(destPath)) {
            fs.copyFileSync(destPath, backupPath);
            console.log(`Backed up ${file}`);
        }
        fs.copyFileSync(srcPath, destPath);
        console.log(`Restored ${file}`);
    } else {
        console.log(`Source file not found: ${srcPath}`);
    }
});
console.log('Done.');
