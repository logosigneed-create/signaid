const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'restoration', 'CustomizerView.Restored.tsx'), 'utf8');
let diff = 0;
content.split('\n').forEach((line, index) => {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    diff += opens - closes;
    if (diff < 0) {
        console.log(`Broke at line ${index + 1}: ${diff}`);
    }
});
console.log(`Final diff: ${diff}`);
