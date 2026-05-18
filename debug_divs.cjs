const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

let stack = [];
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let pos = 0;
    while (true) {
        let open = line.indexOf('<div', pos);
        let close = line.indexOf('</div', pos);
        
        if (open === -1 && close === -1) break;
        
        if (open !== -1 && (close === -1 || open < close)) {
            stack.push(i + 1);
            pos = open + 4;
        } else {
            if (stack.length === 0) {
                console.log(`Unbalanced closing div at line ${i + 1}`);
            } else {
                stack.pop();
            }
            pos = close + 5;
        }
    }
}
console.log('Open divs left:', stack.length);
if (stack.length > 0) {
    console.log('Last unclosed div started at line:', stack[stack.length - 1]);
}
