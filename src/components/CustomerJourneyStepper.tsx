import React from 'react';
import { Sparkles, Sliders, Eye, ShoppingCart, Truck, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';

interface CustomerJourneyStepperProps {
  currentStep: number; // 1: Config, 2: Preview/Watermark, 3: Checkout, 4: Delivery
  onStepClick?: (step: number) => void;
  isUnlocked?: boolean;
}

export const CustomerJourneyStepper: React.FC<CustomerJourneyStepperProps> = ({
  currentStep,
  onStepClick,
  isUnlocked = false,
}) => {
  const steps = [
    {
      num: 1,
      title: '1. Configuration',
      subtitle: 'Preset, Infos & Logo Refonte',
      icon: Sliders,
    },
    {
      num: 2,
      title: '2. Prévisualisation',
      subtitle: 'Maquettes tatouées & Légende IA',
      icon: Eye,
    },
    {
      num: 3,
      title: "3. Choix de l'Offre",
      subtitle: 'Digital (29€) ou Merch (59€)',
      icon: ShoppingCart,
    },
    {
      num: 4,
      title: '4. Livraison',
      subtitle: 'Déblocage HD & Suivi Colis',
      icon: Truck,
    },
  ];

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-widest text-white font-mono">
            LE PARCOURS CLIENT EN 4 ÉTAPES
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          {isUnlocked ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pack Débloqué en HD Sans Filigrane</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>Mode Aperçu Tatoué (Watermark Actif)</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.num;
          const isDone = isUnlocked ? true : currentStep > step.num;

          return (
            <button
              key={step.num}
              type="button"
              onClick={() => onStepClick && onStepClick(step.num)}
              className={`p-3 rounded-xl text-left border transition-all relative overflow-hidden ${
                isActive
                  ? 'bg-zinc-800/90 border-lime-400 ring-1 ring-lime-400 text-white shadow-md shadow-lime-400/10'
                  : isDone
                  ? 'bg-zinc-900/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-500'
                  : 'bg-zinc-950/40 border-zinc-800/50 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-lg ${
                  isActive
                    ? 'bg-lime-400 text-zinc-950 font-black'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">ÉTAPE {step.num}</span>
                )}
              </div>
              <p className="text-xs font-bold truncate text-white">{step.title}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{step.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
