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

let diff = getBalance(c);
console.log('Balance before:', diff);

if (diff > 0) {
    // Need more closing divs
    console.log(`Adding ${diff} closing divs.`);
    let closures = '';
    for(let i=0; i<diff; i++) closures += '</div>';
    c = c.replace(/<\/div>\s*<\/div>\s*\);\s*\};/s, closures + '\n    );\n};');
} else if (diff < 0) {
    // Too many closing divs
    console.log(`Removing ${-diff} closing divs.`);
    for(let i=0; i<-diff; i++) {
        c = c.substring(0, c.lastIndexOf('</div>')) + c.substring(c.lastIndexOf('</div>') + 6);
    }
}

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Final check balance:', getBalance(fs.readFileSync('src/components/CustomizerView.tsx', 'utf8')));
