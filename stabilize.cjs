const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Fix the unclosed portals/expressions balance
// We look for the absolute end and work backwards.
const lastPortalMatch = c.lastIndexOf('document.body\n                )');
if (lastPortalMatch !== -1) {
    // The structure should be:
    // )
    // }
    // </div>
    // </div>
    // );
    // };
    
    // Check if } is missing
    const afterPortal = c.substring(lastPortalMatch + 32);
    if (!afterPortal.includes('}')) {
         console.log('Detected missing expression brace. Repairing tail...');
         c = c.substring(0, lastPortalMatch + 32) + '\n                )}\n            </div>\n        </div>\n    );\n};\n';
    }
}

// 2. Fix the non-button component tags again just to be absolutely sure
c = c.replace(/LazyImage([\s\S]*?)><\/button>/g, 'LazyImage$1 />');
c = c.replace(/CreationToolbar([\s\S]*?)><\/button>/g, 'CreationToolbar$1 />');
c = c.replace(/SignPongRewardModal([\s\S]*?)><\/button>/g, 'SignPongRewardModal$1 />');
c = c.replace(/GuestLimitModal([\s\S]*?)><\/button>/g, 'GuestLimitModal$1 />');
c = c.replace(/ShareDesignModal([\s\S]*?)><\/button>/g, 'ShareDesignModal$1 />');
// Note: Portals use a comma, so we need to be careful with things that close with >,
c = c.replace(/img([\s\S]*?)><\/button>/g, 'img$1 />');

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Final stabilization applied.');
