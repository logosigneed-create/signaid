import React, { useState } from 'react';

export function CustomizerView(props: any) {
    const product = props.products ? props.products[props.initialProductType || 'tshirt'] : null;

    return (
        <div className="flex flex-col flex-1 h-[100dvh] bg-gray-50 overflow-hidden w-full max-w-md mx-auto relative pb-6 shadow-2xl border-x border-gray-200">
            
            <div className="flex-shrink-0 w-full flex items-center justify-between p-4 bg-white z-50 border-b border-gray-100">
                <button onClick={props.onBack} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-700">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2 className="font-black text-lg uppercase tracking-wider text-gray-900">
                    {product?.name || "TEST LAYOUT"}
                </h2>
                <div className="w-10 h-10"></div>
            </div>

            <div className="flex-1 relative flex items-center justify-center min-h-0 bg-white w-full border-b border-gray-100 overflow-hidden">
                <div className="relative w-full max-w-[280px] aspect-[3/4] flex items-center justify-center bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                    
                    <span className="text-gray-400 font-bold text-center">
                        Zone du T-shirt<br/>(Élastique)
                    </span>

                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white rounded-full shadow-lg px-5 py-2.5 border border-gray-100 z-20">
                        <span className="text-orange-500 font-black text-xs">PILULE DE TEST</span>
                    </div>
                </div>
            </div>
            
            <div className="h-40 bg-white flex flex-col items-center justify-center text-green-500 font-black text-center p-4 leading-relaxed">
                <i className="fa-solid fa-circle-check text-4xl mb-2"></i>
                🚨 LE NOUVEAU FICHIER EST CONNECTÉ ! 🚨
            </div>

        </div>
    );
}