const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

function getBalance(text) {
    let o = 0, cl = 0;
    let pos = 0;
    while ((pos = text.indexOf('<div', pos)) !== -1) { o++; pos++; }
    pos = 0;
    while ((pos = text.indexOf('</div', pos)) !== -1) { cl++; pos++; }
    return o - cl;
}

// 1. Strip the end completely
c = c.substring(0, c.lastIndexOf('document.body') + 13) + '\n                )\n                }\n';

// 2. Add as many divs as needed
let diff = getBalance(c);
console.log('Balance to close:', diff);
for(let i=0; i<diff; i++) c += '            </div>\n';

c += '    );\n};\n';

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Final check balance:', getBalance(fs.readFileSync('src/components/CustomizerView.tsx', 'utf8')));
