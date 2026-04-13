const fs = require('fs');
const file = './restoration/CustomizerView.Restored.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('return (') && !line.includes('//')) {
        console.log(`Line ${i+1}: ${line.trim()}`);
    }
});
