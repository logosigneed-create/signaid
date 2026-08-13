const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

let lines = c.split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let pos = 0;
    while (true) {
        // Match both <div> and <div ... >
        let oMatch = line.match(/<div(\s|>)/);
        let cMatch = line.match(/<\/div>/);
        
        // This regex approach is better.
        // We find all tags and closing tags in the line.
        let tags = [...line.matchAll(/<(div|Fragment|button|i|input|img|a|h[1-6]|p|span|section|main|header|footer|nav|ul|li|label|textarea|video|canvas|LazyImage|CreationToolbar|SignPongRewardModal|GuestLimitModal|ShareDesignModal|ReactCrop)([^>]*?)(\/?>)|<\/([a-zA-Z0-9]+)>/g)];
        
        for (let tag of tags) {
            let name = tag[1] || tag[4];
            let isClosing = !!tag[4];
            let isSelfClosing = tag[3] && tag[3].endsWith('/>');
            
            if (isSelfClosing) continue;
            
            if (isClosing) {
                if (stack.length === 0) {
                    console.log(`Unbalanced closing <${name}> at line ${i + 1}`);
                } else {
                    let top = stack.pop();
                    if (top.name !== name) {
                        console.log(`Mismatch at line ${i + 1}: found </${name}>, expected </${top.name}> (opened at line ${top.line})`);
                    }
                }
            } else {
                stack.push({ name: name, line: i + 1 });
            }
        }
        break;
    }
}
console.log('Unclosed tags left:', stack.length);
if (stack.length > 0) {
     console.log('Last unclosed tag:', stack[stack.length-1]);
}
