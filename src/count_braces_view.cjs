const fs = require('fs');
const file = './restoration/CustomizerView.Restored.tsx';
try {
    const content = fs.readFileSync(file, 'utf8');
    const open = (content.match(/{/g) || []).length;
    const close = (content.match(/}/g) || []).length;
    console.log(`{ counts: ${open}`);
    console.log(`} counts: ${close}`);
    if (open !== close) {
        console.log('MISMATCH DETECTED!');
    } else {
        console.log('Balance OK');
    }
} catch (e) {
    console.error(e);
}
