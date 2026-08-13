const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// Fix specific corrupted tags
c = c.replace(/<\/i \/>/g, '</i>');
c = c.replace(/><\/button>/g, '/>'); // General revert for self-closing tags that were broken
// But wait! Actual buttons SHOULD be </button>.
// Revert only for components that are NOT true buttons.
const components = ['LazyImage', 'CreationToolbar', 'SignPongRewardModal', 'GuestLimitModal', 'ShareDesignModal', 'input', 'img', 'Fragment'];
components.forEach(comp => {
    const reg = new RegExp('<' + comp + '([^>]*?)><\/button>', 'g');
    c = c.replace(reg, '<' + comp + '$1 />');
});

// Fix the missing </button> from my previous step
c = c.replace(/object-contain\" \/>\s*<\/button>/g, 'object-contain" />\n                                                            </button>');

// Ensure all <i> have </i>
c = c.replace(/<i ([^>]*?) \/>/g, '<i $1></i>');

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Surgical cleaning complete.');
