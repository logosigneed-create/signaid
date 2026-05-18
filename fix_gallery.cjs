const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Fix the missing </button> in filteredLogos map
const pattern = /<button key=\{idx\} onClick=\{[^}]+} className=\"flex-shrink-0 w-16 h-16 border rounded-lg p-2 bg-gray-800 hover:border-orange-500\"><img src=\{getProxiedUrl\(Array.isArray\(logo.url\) \? logo.url\[0\] : logo.url\)\} className=\"max-w-full max-h-full object-contain\"  \/>/g;

if (c.match(pattern)) {
    c = c.replace(pattern, (match) => match + '</button>');
    console.log('Fixed missing </button> in gallery.');
}

// 2. Fix the structural tail again (it keeps getting corrupted)
const portalClose = 'document.body\n                )';
const lastPos = c.lastIndexOf(portalClose);
if (lastPos !== -1) {
    c = c.substring(0, lastPos + portalClose.length) + '\n                )}\n            </div>\n        </div>\n    );\n};\n';
}

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Re-stabilization complete.');
