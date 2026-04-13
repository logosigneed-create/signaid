const fs = require('fs');
const content = fs.readFileSync('restoration/CustomizerView.Restored.tsx', 'utf8');
let diff = 0;
content.split('\n').forEach((line, index) => {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    diff += opens - closes;
    if (index >= 4780 && index <= 4800) {
        console.log(`${index + 1}: diff ${diff} | ${opens} open, ${closes} close | ${line.trim()}`);
    }
});
