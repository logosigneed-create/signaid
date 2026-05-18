const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Remove incorrectly injected closure lines
c = c.replace(/<\/div><\/div><\/div><\/div>\s*<\/div>/g, '</div>'); // Simple cleanup
c = c.replace(/<\/div><\/div><\/div><\/div>/g, '</div>');

// 2. Fix the tail properly
// Find the ABSOLUTE last instance of document.body
const bodyInstances = [];
let pos = 0;
while ((pos = c.indexOf('document.body', pos)) !== -1) {
    bodyInstances.push(pos);
    pos += 13;
}

if (bodyInstances.length > 0) {
    const lastBodyIdx = bodyInstances[bodyInstances.length - 1];
    c = c.substring(0, lastBodyIdx + 13) + '\n                )\n                }\n            </div>\n        </div>\n    );\n};\n';
}

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Structural cleanup complete.');
