const fs = require('fs');
let c = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Fix the Gallery Map
const galleryPattern = /\{filteredLogos\.map\(\(logo: any, idx: number\) => \([\s\S]*?\}\)\}/;
const correctGallery = `{filteredLogos.map((logo: any, idx: number) => (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => handlePredefinedLogoSelect(Array.isArray(logo.url) ? logo.url[0] : logo.url)} 
                                                                className="flex-shrink-0 w-16 h-16 border rounded-lg p-2 bg-gray-800 hover:border-orange-500"
                                                            >
                                                                <img src={getProxiedUrl(Array.isArray(logo.url) ? logo.url[0] : logo.url)} className="max-w-full max-h-full object-contain" />
                                                            </button>
                                                        ))}`;

if (c.match(galleryPattern)) {
    c = c.replace(galleryPattern, correctGallery);
    console.log('Gallery fixed.');
}

// 2. Fix the tail (expression close + portal close + root divs)
// The last portal is showAiResultModal
const aiResultPortalStart = 'showAiResultModal && (aiResults || aiResult) && createPortal(';
const startIdx = c.lastIndexOf(aiResultPortalStart);
if (startIdx !== -1) {
    // Keep everything up to the last document.body
    const bodyIdx = c.lastIndexOf('document.body');
    if (bodyIdx > startIdx) {
        c = c.substring(0, bodyIdx) + 'document.body\n                )\n                }\n            </div>\n        </div>\n    );\n};\n';
    }
}

// 3. Fix any lingering / / or </i />
c = c.replace(/\/ \/>/g, '/>');
c = c.replace(/<\/i \/>/g, '</i>');

fs.writeFileSync('src/components/CustomizerView.tsx', c);
console.log('Master cleanup complete.');
