import React, { useState } from 'react';
import { GeneratedPack, PackageType, OrderRecord } from '../types';
import {
  X,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  pack: GeneratedPack;
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: OrderRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  pack,
  isOpen,
  onClose,
  onOrderCompleted,
}) => {
  const [packageType, setPackageType] = useState<PackageType>('physical_merch_pack');
  const [customerName, setCustomerName] = useState('Alexandre "DJ KRONOS"');
  const [customerEmail, setCustomerEmail] = useState('kronos.booking@gmail.com');
  const [customerPhone, setCustomerPhone] = useState('+33 6 12 34 56 78');
  const [tshirtSize, setTshirtSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [shippingAddress, setShippingAddress] = useState('22 Rue Oberkampf, 75011 Paris, France');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    order: OrderRecord;
    emailInfo: any;
  } | null>(null);

  if (!isOpen) return null;

  const baseEur = packageType === 'physical_merch_pack' ? 59 : 29;
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
          tshirtSize: packageType === 'physical_merch_pack' ? tshirtSize : undefined,
          tshirtQty: 1,
          tshirtColor: pack.input.tshirtColor,
          shippingAddress: packageType === 'physical_merch_pack' ? shippingAddress : undefined,
          totalEur,
          packSnapshot: pack,
        }),
      });

      const result = await response.json();
      if (result.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        setCompletedOrder({
          order: result.order,
          emailInfo: result.emailDispatchInfo,
        });
        onOrderCompleted(result.order);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Close Button */}
        <button
          id="btn-close-checkout"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!completedOrder ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-lime-400" />
              <span className="text-xs font-mono font-bold text-lime-400 uppercase tracking-widest">
                AUTOMATISATION B2B SAAS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne']">
              Finaliser la Commande du Pack
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Paiement en ligne sécurisé. Les fichiers digitaux sont envoyés instantanément par mail.
            </p>

            {/* Offer Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Option 1: Digital Only */}
              <div
                id="select-offer-digital"
                onClick={() => setPackageType('digital_pack')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  packageType === 'digital_pack'
                    ? 'bg-zinc-800/90 border-lime-400 ring-1 ring-lime-400'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Pack Digital</span>
                  <span className="text-lg font-black text-white">29 €</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Débloque instantanément les téléchargements HD (SVG/PNG) sans filigrane et copie les textes réseaux sociaux.
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-lime-400 font-semibold">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Livraison immédiate sans filigrane</span>
                </div>
              </div>

              {/* Option 2: Physical Merch + Digital */}
              <div
                id="select-offer-physical"
                onClick={() => setPackageType('physical_merch_pack')}
                className={`p-4 rounded-2xl border cursor-pointer relative transition-all ${
                  packageType === 'physical_merch_pack'
                    ? 'bg-zinc-800/90 border-lime-400 ring-1 ring-lime-400'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                  Le Plus Populaire
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Pack Premium Merch + Digital</span>
                  <span className="text-lg font-black text-white">59 €</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  En plus des fichiers HD sans filigrane, choisis ta taille de t-shirt (S à XXL) pour recevoir ton t-shirt floqué en atelier.
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <Shirt className="w-3.5 h-3.5" />
                  <span>Pressé en atelier + Fichier découpe DTF</span>
                </div>
              </div>
            </div>

            {/* Logo Redesign Addon Notice */}
            {pack.input.isLogoRedesignRequested && (
              <div className="mt-4 p-3.5 rounded-2xl bg-zinc-950 border border-amber-400/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Service Studio Premium : Refonte &amp; Vectorisation HD</p>
                    <p className="text-[11px] text-zinc-400">Tracé vectoriel SVG/EPS 300 DPI infini, nettoyé et prêt pour flocage &amp; sérigraphie</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/30 shrink-0">
                  +15 €
                </span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleCheckoutSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Nom / Pseudonyme DJ *
                  </label>
                  <input
                    id="input-customer-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    Email de Réception *
                  </label>
                  <input
                    id="input-customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Physical Merch Details */}
              {packageType === 'physical_merch_pack' && (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Taille du T-Shirt (Coton Peigné 240g)
                    </label>
                    <div className="flex gap-1.5">
                      {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          id={`tshirt-size-${sz}`}
                          onClick={() => setTshirtSize(sz)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${
                            tshirtSize === sz
                              ? 'bg-lime-400 text-zinc-950 border-lime-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      Adresse de Livraison Postale *
                    </label>
                    <input
                      id="input-shipping-address"
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Rue, Code Postal, Ville, Pays"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Order Summary & Submit */}
              <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-400">Total à régler :</div>
                  <div className="text-2xl font-black text-white">{totalEur} € TTC</div>
                </div>

                <button
                  id="btn-confirm-checkout"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Traitement du paiement...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Payer &amp; Déclencher l'Automatisation ({totalEur}€)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation & Automated Dispatch Screen */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-lime-400/20 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-400/40">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-black text-white font-['Syne']">
              Paiement Validé &amp; Process Déclenché !
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Commande N° <strong className="text-lime-400 font-mono">{completedOrder.order.id}</strong> • Enregistrée avec succès
            </p>

            {/* Email Dispatch Simulation Box */}
            <div className="mt-6 text-left bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Mail className="w-4 h-4 text-lime-400" />
                  <span>Simulation Envoi d'Email Automatique</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ENVOYÉ INSTANTANÉMENT
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-zinc-300 font-mono">
                <div><strong>Destinataire :</strong> {completedOrder.emailInfo.to}</div>
                <div><strong>Objet :</strong> {completedOrder.emailInfo.subject}</div>
                <div>
                  <strong>Fichiers inclus :</strong>
                  <ul className="list-disc pl-5 mt-1 text-zinc-400 font-sans">
                    {completedOrder.emailInfo.filesIncluded.map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {completedOrder.order.packageType === 'physical_merch_pack' && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 bg-emerald-950/20 -mx-5 -mb-5 p-4 rounded-b-2xl border-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Scissors className="w-4 h-4" />
                    <span>Transmis à l'Atelier Impression DTF</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Le fichier prêt à découper a été généré et déposé dans l'Atelier. Il ne reste plus qu'à presser le
                    t-shirt (taille {completedOrder.order.tshirtSize}).
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-finish-order"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
