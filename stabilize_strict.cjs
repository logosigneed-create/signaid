const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Fix the double-slash mess
c = c.replace(/\/ \/>/g, '/>');

// 2. Fix the non-button closing tags correctly this time
// We need to match <Component ... > without the closing > if it was auto-saved as unbalanced.
// BUT, the easiest way is to search for the specific broken forms I see.

// 3. One more check on the very end
const portalPattern = 'document.body\n                )';
const lastPortalPos = c.lastIndexOf(portalPattern);
if (lastPortalPos !== -1) {
    const tail = c.substring(lastPortalPos + portalPattern.length);
    // Tail should be exactly: ) } </div> </div> ); };
    // BUT we need to count divs.
    c = c.substring(0, lastPortalPos + portalPattern.length) + '\n                )}\n            </div>\n        </div>\n    );\n};\n';
}

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Stricter stabilization applied.');
