const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'restoration', 'CustomizerView.Restored.tsx'), 'utf8');
let diff = 0;
content.split('\n').forEach((line, index) => {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    diff += opens - closes;
    console.log(`${index + 1}: diff ${diff}`);
});
