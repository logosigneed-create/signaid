const fs = require('fs');
let code = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

// 1. Audio
const targetAudio = `                        if (resultUrl) {
                            setAiResults(prev => isBack ? { ...prev, back: resultUrl } : { ...prev, front: resultUrl });
                        }`;
const replAudio = `                        if (resultUrl) {
                            setAiResults(prev => isBack ? { ...prev, back: resultUrl } : { ...prev, front: resultUrl });
                            try {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.volume = 0.5;
                                audio.play().catch(e => console.warn(e));
                            } catch (e) {}
                        }`;
if (code.includes(targetAudio)) { code = code.replace(targetAudio, replAudio); }

// 2. Blur opacity 1
const targetBlur1 = `img src={capturedImage} className={\`w-full h-full object-contain bg-black transition-all duration-500 \${aiGenerating ? 'blur-md scale-105 opacity-50' : ''}\`}`;
const replBlur1 = `img src={capturedImage} className="w-full h-full object-contain bg-black transition-all duration-500"`;
if (code.includes(targetBlur1)) { code = code.replace(targetBlur1, replBlur1); }

// 3. Blur opacity 2
const targetBlur2 = `className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"`;
const replBlur2 = `className="absolute inset-0 w-full h-full object-contain bg-black"`;
if (code.includes(targetBlur2)) { code = code.replace(targetBlur2, replBlur2); }

// 4. Categories dynamic nav
const targetCatRegex = /<p className="text-\[10px\] font-black text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">[\s\S]*?<div className="relative group">/;
const replCat = `                                            {(() => {
                                                const availableCats = Object.keys(STYLE_MATRIX).filter(cat => STYLE_MATRIX[cat].some(s => s.image)).concat(["Custom"]);
                                                const currentIdx = availableCats.indexOf(activeStyleCategory);
                                                const prevCat = currentIdx > 0 ? availableCats[currentIdx - 1] : '';
                                                const nextCat = currentIdx < availableCats.length - 1 ? availableCats[currentIdx + 1] : '';

                                                return (
                                                    <div className="flex items-center justify-between w-full mb-4">
                                                        <div className="flex-1 flex max-w-[30%] text-left overflow-hidden">
                                                            {prevCat && (
                                                                <button onClick={() => { setActiveStyleCategory(prevCat); document.getElementById(\`category-\${prevCat}\`)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' }); }} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest truncate w-full text-left transition-colors flex items-center gap-1">
                                                                    <i className="fa-solid fa-chevron-left"></i>
                                                                    <span className="truncate">{prevCat}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex-1 max-w-[40%] flex justify-center items-center gap-2 overflow-hidden px-2">
                                                            <i className="fa-solid fa-layer-group text-orange-500 text-sm hidden sm:block"></i>
                                                            <span className="text-xs font-black text-orange-500 uppercase tracking-widest truncate text-center">
                                                                {activeStyleCategory}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 flex max-w-[30%] text-right overflow-hidden">
                                                            {nextCat && (
                                                                <button onClick={() => { setActiveStyleCategory(nextCat); document.getElementById(\`category-\${nextCat}\`)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' }); }} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest w-full text-right transition-colors flex items-center justify-end gap-1">
                                                                    <span className="truncate">{nextCat}</span>
                                                                    <i className="fa-solid fa-chevron-right"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className="relative group">`;
if (targetCatRegex.test(code)) {
    code = code.replace(targetCatRegex, replCat);
} else {
    console.warn("Category regex not found!");
}

fs.writeFileSync('src/components/CustomizerView.tsx', code, 'utf8');
console.log('Patch complete.');
