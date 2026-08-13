const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Revert incorrect button closing tags on non-button components
c = c.replace(/LazyImage([\s\S]*?)><\/button>/g, 'LazyImage$1 />');
c = c.replace(/CreationToolbar([\s\S]*?)><\/button>/g, 'CreationToolbar$1 />');

// 2. Fix the Fragment balance
// I see <Fragment> at 3767. Let's make sure it's closed before the portals start.
// Portals start at 4003: {/* UNIVERSAL MODAL PORTALS */}
if (c.includes('<Fragment>') && !c.includes('</Fragment>')) {
     // Already checked 3993 and it's there.
}

// 3. Fix the double-close at the end.
// TS error (5450,9) suggests too many closing tags or a comma expected.
// Current tail:
/*
5448:                 )}
5449:             </div>
5450:         </div>
5451:     </div>
5452:     </div>
5453:     );
5454: };
*/
// The component returns ( <div ... > ... </div> );
// If 5451 and 5452 are extra, that's the issue.

// Let's count divs in the whole file again.
let o = 0, cl = 0;
let pos = 0;
while((pos = c.indexOf('<div', pos)) !== -1) { o++; pos++; }
pos = 0;
while((pos = c.indexOf('</div', pos)) !== -1) { cl++; pos++; }
console.log('Balance:', {o, cl});

if (cl > o) {
    const diff = cl - o;
    console.log(`Removing ${diff} extra closing divs from the end.`);
    for(let i=0; i<diff; i++) {
        c = c.substring(0, c.lastIndexOf('</div>')) + c.substring(c.lastIndexOf('</div>') + 6);
    }
}

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Purification complete.');
