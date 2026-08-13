const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Separate Code Panel and AI Modal
// The code panel starts at 4609 and should end with document.body.
// The AI modal starts with aiModalOpen && createPortal.

// Let's find where the AI content starts leaking into the code panel.
const aiContentStart = "{/* AI STUDIO \"PAGE\" OVERLAY - FULLSCREEN FLOW */}";
const aiContentIdx = c.indexOf(aiContentStart);

if (aiContentIdx !== -1) {
    // The code panel must close before AI content starts.
    // We need to find the balanced end of the code panel before aiContentIdx.
    const partBeforeAI = c.substring(0, aiContentIdx);
    
    // Check if the code panel is closed.
    if (!partBeforeAI.includes('document.body') || partBeforeAI.lastIndexOf('document.body') < partBeforeAI.lastIndexOf('createPortal')) {
        console.log('Code panel unclosed before AI content. Repairing...');
        // We'll surgically insert the missing closure.
        // The code panel usually has 2 root divs.
        const repair = '\n                            </div>\n                        </div>,\n                        document.body\n                    )\n                }\n\n                ';
        // We insert it before the AI content starts, but we need to make sure we closed the code conditional.
        // Wait! We'll just rebuild that section.
    }
}

// 2. Fix the specific leaked AI cards
// The "Custom Prompt Card" and "Styles Nav Arrows" should be inside the AI portal.
// I'll move them.

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Script check done (not applied yet, need better strategy).');
