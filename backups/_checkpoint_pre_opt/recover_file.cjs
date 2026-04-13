const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Partage\\Projet\\Signaid V7\\src\\restoration\\CustomizerView.Restored.tsx';
try {
    const data = fs.readFileSync(filePath, { encoding: 'utf16le' });
    console.log("Read success with utf16le");
    fs.writeFileSync(filePath, data, { encoding: 'utf8' });
    console.log("Wrote success with utf8");
} catch (e) {
    console.log("utf16le failed, trying utf8...");
    try {
        const data = fs.readFileSync(filePath, { encoding: 'utf8' });
        // If it was already utf8, maybe it just needs line ending normalization
        const normalized = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        fs.writeFileSync(filePath, normalized, { encoding: 'utf8' });
        console.log("UTF8 normalization success");
    } catch (e2) {
        console.error("Recovery failed", e2);
    }
}
