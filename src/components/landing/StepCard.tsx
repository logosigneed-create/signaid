import React from 'react';
import { FeatureData } from '../../landingTypes';

interface FeatureCardProps {
    step: FeatureData;
    isLast?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ step }) => {
    const Icon = step.icon;

    return (
        <div className="group relative bg-white border border-gray-100 hover:border-brand-orange/30 p-8 rounded-2xl transition-all duration-500 hover:shadow-xl hover:shadow-brand-orange/5">

            <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900 group-hover:bg-brand-orange group-hover:text-white transition-colors duration-300">
                    <Icon size={24} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-brand-orange transition-colors">
                    {step.id}
                </span>
            </div>

            <div className="mb-4">
                <h3 className="text-xs font-bold text-brand-orange uppercase tracking-wider mb-2">
                    {step.subtitle}
                </h3>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight leading-none group-hover:translate-x-1 transition-transform duration-300">
                    {step.title}
                </h2>
            </div>

            <p className="text-gray-500 font-light leading-relaxed text-sm mb-6">
                {step.description}
            </p>

            <div className="pt-6 border-t border-gray-50">
                <div className="flex flex-wrap gap-2">
                    {step.details?.map((detail, idx) => (
                        <span key={idx} className="px-2 py-1 bg-zinc-50 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded border border-zinc-100">
                            {detail}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeatureCard;
