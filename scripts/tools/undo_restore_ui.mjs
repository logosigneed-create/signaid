import fs from 'fs';
import path from 'path';

const filesToRestore = [
    'src/CustomizerApp.tsx',
    'src/components/CustomizerView.tsx',
    'src/components/DesktopNavbar.tsx',
    'src/components/UniversalMenu.tsx',
    'src/components/LogoOptionsModal.tsx',
    'src/components/MobileBottomNav.tsx',
    'src/components/CartView.tsx'
];

const targetDir = 'C:\\Partage\\Projet\\Signaid V24';

console.log('Undoing restore...');

filesToRestore.forEach(file => {
    const destPath = path.join(targetDir, file);
    const backupPath = destPath + '.bak_march28';

    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, destPath);
        console.log(`Reverted ${file} from backup`);
    } else {
        console.log(`Backup not found for ${file}`);
    }
});
console.log('Undo done.');
