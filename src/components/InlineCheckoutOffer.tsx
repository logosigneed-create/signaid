import React, { useState } from 'react';
import { GeneratedPack, PackageType, OrderRecord } from '../types';
import {
  CreditCard,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Download,
  Shirt,
  Sparkles,
  ArrowRight,
  Package,
  Clock,
  Scissors,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InlineCheckoutOfferProps {
  pack: GeneratedPack;
  isUnlocked: boolean;
  onOrderCompleted: (order: OrderRecord) => void;
  onRequestScrollToCopy?: () => void;
}

export const InlineCheckoutOffer: React.FC<InlineCheckoutOfferProps> = ({
  pack,
  isUnlocked,
  onOrderCompleted,
  onRequestScrollToCopy,
}) => {
  const [packageType, setPackageType] = useState<PackageType>('physical_merch_pack');
  const [customerName, setCustomerName] = useState('Alexandre "DJ KRONOS"');
  const [customerEmail, setCustomerEmail] = useState('kronos.booking@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('+33 6 12 34 56 78');
  const [tshirtSize, setTshirtSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [shippingAddress, setShippingAddress] = useState('22 Rue Oberkampf, 75011 Paris, France');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderRecord | null>(null);

  const getBasePrice = (type: PackageType): number => {
    switch (type) {
      case 'digital_starter':
        return 29;
      case 'physical_merch_pack':
        return 59;
      case 'box_merch_50':
        return 490;
      default:
        return 59;
    }
  };

  const baseEur = getBasePrice(packageType);
  const logoRefonteEur = pack.input.isLogoRedesignRequested ? 15 : 0;
  const totalEur = baseEur + logoRefonteEur;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          packageType,
          tshirtSize: packageType !== 'digital_starter' ? tshirtSize : undefined,
          tshirtQty: packageType === 'box_merch_50' ? 50 : 1,
          tshirtColor: pack.input.tshirtColor,
          shippingAddress: packageType !== 'digital_starter' ? shippingAddress : undefined,
          totalEur,
          packSnapshot: pack,
        }),
      });

      const result = await response.json();
      if (result.success) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        setOrderSuccess(result.order);
        onOrderCompleted(result.order);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section
      id="section-offre-checkout"
      className="p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border-2 border-lime-400/40 shadow-2xl shadow-black/60 relative overflow-hidden"
    >
      {/* Decorative ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 text-xs font-mono font-bold uppercase tracking-wider">
              Étape Suivante • Offre &amp; Checkout
            </span>
            {isUnlocked && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pack Actif &amp; Payé</span>
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight mt-2">
            Sélectionne ton Pack &amp; Valide ta Date
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Du pack digital haute définition aux fichiers prêts pour l'atelier presse. Le paiement sur cette page débloque immédiatement les téléchargements HD et la section textes/réseaux sociaux.
          </p>
        </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-zinc-400 font-mono block">Montant à régler :</span>
            <span className="text-3xl font-black text-lime-400 font-['Syne']">
              {totalEur}€ <span className="text-xs text-zinc-400 font-normal">HT</span>
            </span>
            <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-end gap-1.5">
              <Sparkles className="w-3 h-3 text-lime-400" />
              <span>Coût de génération IA : </span>
              <span className="text-lime-400 font-bold">
                {pack.generationCostEur !== undefined ? `${pack.generationCostEur.toFixed(2)}€` : '0.04€'}
              </span>
              <span className="text-zinc-500">(Inclus)</span>
            </div>
          </div>
        </div>

      {orderSuccess ? (
        /* Écran de confirmation de paiement sur place */
        <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center mx-auto shadow-lg shadow-lime-400/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white font-['Syne']">
            Commande #{orderSuccess.id.slice(-6).toUpperCase()} Confirmée !
          </h3>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            Merci <strong className="text-white">{orderSuccess.customerName}</strong>. Ton pack visuel haute définition 300 DPI est débloqué, ainsi que la <strong className="text-lime-400">Section 3 (Textes &amp; Réseaux Sociaux IA)</strong> ci-dessous !
          </p>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-md mx-auto text-left text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Formule choisie :</span>
              <span className="text-white font-bold">{orderSuccess.packageType}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Email de livraison :</span>
              <span className="text-white">{orderSuccess.customerEmail}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Statut Atelier Presse :</span>
              <span className="text-lime-400 font-bold">{orderSuccess.status}</span>
            </div>
          </div>
          {onRequestScrollToCopy && (
            <button
              type="button"
              onClick={onRequestScrollToCopy}
              className="mt-4 px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/20 inline-flex items-center gap-2"
            >
              <span>Accéder aux Textes &amp; Réseaux Sociaux débloqués</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Formulaire de sélection et paiement sur place */
        <div className="mt-6 space-y-6">
          {/* 1. Sélecteur de Pack */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option 1: Digital Starter 29€ */}
            <div
              onClick={() => setPackageType('digital_starter')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                packageType === 'digital_starter'
                  ? 'bg-lime-400/10 border-lime-400 shadow-md shadow-lime-400/10'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Option 1</span>
                  {packageType === 'digital_starter' && (
                    <span className="w-2 h-2 rounded-full bg-lime-400" />
                  )}
                </div>
                <h4 className="text-sm font-black text-white font-['Syne'] mt-1">
                  Pack Digital Starter
                </h4>
                <div className="text-xl font-black text-lime-400 font-['Syne'] mt-1">
                  29€ <span className="text-[10px] text-zinc-400 font-normal">HT</span>
                </div>
                <ul className="text-[11px] text-zinc-300 space-y-1.5 mt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Affiche A3 Print Vectoriel 300 DPI</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Story 9:16 + Post 1:1 + Bannière Web</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Déblocage Section 3 Textes &amp; Réseaux IA</span>
                  </li>
                  <li className="flex items-center gap-1.5 text-lime-400/90 font-mono">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Coût de calcul IA : {pack.generationCostEur ? `${pack.generationCostEur.toFixed(2)}€` : '0.04€'} (inclus)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Option 2: Digital + Prêt-à-presser DTF 59€ (Recommandé) */}
            <div
              onClick={() => setPackageType('physical_merch_pack')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                packageType === 'physical_merch_pack'
                  ? 'bg-lime-400/15 border-lime-400 shadow-xl shadow-lime-400/20'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-lime-400 text-zinc-950 text-[9px] font-black uppercase tracking-wider">
                Recommandé
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-lime-400 uppercase">Option 2</span>
                  {packageType === 'physical_merch_pack' && (
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  )}
                </div>
                <h4 className="text-sm font-black text-white font-['Syne'] mt-1">
                  Digital + Prêt-à-Presser DTF
                </h4>
                <div className="text-xl font-black text-lime-400 font-['Syne'] mt-1">
                  59€ <span className="text-[10px] text-zinc-400 font-normal">HT</span>
                </div>
                <ul className="text-[11px] text-zinc-300 space-y-1.5 mt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Tout le Pack Digital Haute Définition</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Fichier Vectoriel DTF / Flex sans fond</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Transmission automatique à l'Atelier Presse</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Option 3: Box Merch Physique 490€ */}
            <div
              onClick={() => setPackageType('box_merch_50')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                packageType === 'box_merch_50'
                  ? 'bg-lime-400/10 border-lime-400 shadow-md shadow-lime-400/10'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Option 3</span>
                  {packageType === 'box_merch_50' && (
                    <span className="w-2 h-2 rounded-full bg-lime-400" />
                  )}
                </div>
                <h4 className="text-sm font-black text-white font-['Syne'] mt-1">
                  Box Merch (50 T-Shirts)
                </h4>
                <div className="text-xl font-black text-lime-400 font-['Syne'] mt-1">
                  490€ <span className="text-[10px] text-zinc-400 font-normal">HT</span>
                </div>
                <ul className="text-[11px] text-zinc-300 space-y-1.5 mt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>50 T-Shirts 100% Coton 240g imprimés</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                    <span>Livraison atelier sous 48h</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Formulaire de coordonnées et paiement direct */}
          <form onSubmit={handleCheckoutSubmit} className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nom / DJ / Collectif
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 transition"
                  placeholder="DJ KRONOS"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email de réception des fichiers
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 transition"
                  placeholder="contact@club.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Téléphone (suivi SMS)
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 transition"
                  placeholder="+33 6 ..."
                />
              </div>
            </div>

            {/* Détails spécifiques si t-shirt ou prêt-à-presser */}
            {packageType !== 'digital_starter' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Taille T-Shirt Prototype
                  </label>
                  <div className="flex gap-2">
                    {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setTshirtSize(sz)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          tshirtSize === sz
                            ? 'bg-lime-400 text-zinc-950 font-black'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Adresse d'expédition / Atelier
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 transition"
                    placeholder="Adresse de livraison"
                  />
                </div>
              </div>
            )}

            {/* Paiement simulé sécurisé */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Paiement sécurisé SSL 256 bits • Déblocage immédiat</span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 hover:opacity-95 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-lime-400/25 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Traitement sécurisé en cours...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Régler {totalEur}€ HT &amp; Débloquer Immédiatement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
