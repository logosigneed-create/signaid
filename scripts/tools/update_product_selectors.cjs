const fs = require('fs');

let code = fs.readFileSync('src/components/CustomizerView.tsx', 'utf8');

const targetDesktopStr = `            <div className="hidden lg:flex w-full h-14 items-center justify-center bg-transparent z-40">
                {/* Desktop: Back Button Left + Selector Center */}
                <div className="hidden lg:flex items-center justify-center w-full px-6 relative">

                    <div data-layout-id="garment-selector-desktop" className="flex items-center gap-6">
                        <button onClick={() => changeProductType('prev')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i data-layout-id="garment-selector-prev" className="fa-solid fa-chevron-left"></i>
                        </button>
                        <div className="flex flex-col items-center min-w-[280px]">
                            <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest text-center">{product.name}</h2>
                            <div className="flex items-center gap-2 -mt-1">
                                <span className="text-xs font-bold text-gray-500">{product.reference}</span>
                                {product.supplierLink && (
                                    <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors" title="Fiche Technique">
                                        <i className="fa-solid fa-file-contract"></i> Info
                                    </a>
                                )}
                            </div>
                        </div>
                        <button onClick={() => changeProductType('next')} className="text-orange-600 hover:text-orange-800 p-2 font-black text-2xl transition-transform hover:scale-120">
                            <i data-layout-id="garment-selector-next" className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>`;

const replDesktopStr = `            <div className="hidden lg:flex w-full h-14 items-center justify-center bg-transparent z-40 mb-2">
                {(() => {
                    const types = Object.keys(products);
                    const idx = types.indexOf(item.productType);
                    const prevType = types[(idx - 1 + types.length) % types.length];
                    const nextType = types[(idx + 1) % types.length];
                    const prevProduct = products[prevType];
                    const nextProduct = products[nextType];

                    return (
                        <div data-layout-id="garment-selector-desktop" className="flex items-center justify-between w-full max-w-2xl px-6">
                            <div className="flex-1 flex max-w-[30%] text-left overflow-hidden">
                                <button onClick={() => changeProductType('prev')} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest truncate w-full text-left transition-colors flex items-center gap-2">
                                    <i data-layout-id="garment-selector-prev" className="fa-solid fa-chevron-left text-lg"></i>
                                    <span className="truncate">{prevProduct.name}</span>
                                </button>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center justify-center min-w-[280px]">
                                <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest text-center truncate">{product.name}</h2>
                                <div className="flex items-center justify-center gap-2 -mt-1 w-full">
                                    <span className="text-xs font-bold text-gray-500">{product.reference}</span>
                                    {product.supplierLink && (
                                        <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors" title="Fiche Technique">
                                            <i className="fa-solid fa-file-contract"></i> Info
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex max-w-[30%] text-right overflow-hidden">
                                <button onClick={() => changeProductType('next')} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest w-full text-right transition-colors flex items-center justify-end gap-2">
                                    <span className="truncate">{nextProduct.name}</span>
                                    <i data-layout-id="garment-selector-next" className="fa-solid fa-chevron-right text-lg"></i>
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>`;

if(code.includes(targetDesktopStr)) {
    code = code.replace(targetDesktopStr, replDesktopStr);
    console.log("Desktop header replaced.");
} else {
    console.log("Desktop header NOT FOUND.");
}

const targetMobileStr = `            {/* Mobile Selector Header (Original style restored) - Fixed Height */}
            <div data-layout-id="garment-selector-mobile" className="lg:hidden w-full flex flex-col bg-transparent transition-all flex-shrink-0 shadow-none z-50 min-h-[48px] border-none mb-2">
                <div className="w-full flex items-center justify-center gap-6 py-1 px-4">
                    <button onClick={() => changeProductType('prev')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <div className="flex-1 flex flex-col items-center overflow-hidden">
                        <h2 className="text-lg font-black text-orange-600 uppercase tracking-widest text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">{product.name}</h2>
                        <div className="flex items-center gap-2 -mt-0.5">
                            <span className="text-[10px] font-bold text-gray-500">{product.reference}</span>
                            {product.supplierLink && (
                                <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[9px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors" title="Fiche Technique">
                                    <i className="fa-solid fa-file-contract"></i> Info
                                </a>
                            )}
                        </div>
                    </div>
                    <button onClick={() => changeProductType('next')} className="text-orange-600 p-2 font-black text-xl">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>`;

const replMobileStr = `            {/* Mobile Selector Header (Original style restored) - Fixed Height */}
            <div data-layout-id="garment-selector-mobile" className="lg:hidden w-full flex flex-col bg-transparent transition-all flex-shrink-0 shadow-none z-50 min-h-[48px] border-none mb-2">
                {(() => {
                    const types = Object.keys(products);
                    const idx = types.indexOf(item.productType);
                    const prevType = types[(idx - 1 + types.length) % types.length];
                    const nextType = types[(idx + 1) % types.length];
                    const prevProduct = products[prevType];
                    const nextProduct = products[nextType];

                    return (
                        <div className="w-full flex items-center justify-between py-1 px-4 gap-2">
                            <div className="flex-1 flex max-w-[25%] text-left overflow-hidden px-1">
                                <button onClick={() => changeProductType('prev')} className="text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest truncate w-full text-left flex items-center gap-1">
                                    <i className="fa-solid fa-chevron-left"></i>
                                    <span className="truncate">{prevProduct.name}</span>
                                </button>
                            </div>

                            <div className="flex-[2] flex flex-col items-center overflow-hidden min-w-0">
                                <h2 className="text-lg font-black text-orange-600 uppercase tracking-[0.15em] text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                    {product.name}
                                </h2>
                                <div className="flex items-center justify-center gap-2 -mt-0.5 w-full">
                                    <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">{product.reference}</span>
                                    {product.supplierLink && (
                                        <a href={product.supplierLink} target="_blank" rel="noopener noreferrer" className="text-[8px] flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors whitespace-nowrap" title="Fiche Technique">
                                            <i className="fa-solid fa-file-contract"></i> Info
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex max-w-[25%] text-right overflow-hidden px-1">
                                <button onClick={() => changeProductType('next')} className="text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest truncate w-full text-right flex items-center justify-end gap-1">
                                    <span className="truncate">{nextProduct.name}</span>
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>`;

if(code.includes(targetMobileStr)) {
    code = code.replace(targetMobileStr, replMobileStr);
    console.log("Mobile header replaced.");
} else {
    console.log("Mobile header NOT FOUND.");
}

fs.writeFileSync('src/components/CustomizerView.tsx', code, 'utf8');
