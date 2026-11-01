/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Signaid - Boutique Textile Officielle en Marque Blanche (/:slug/shop & /shop/:slug)
 * Stand Merch officiel du créatif avec catalogue textile, commande DTF et panier.
 * RÈGLE D'OR VISUELLE : Priorité absolue aux visuels réels et shootings stockés
 * (tshirtPreviewImages) sans superposition de logo automatique.
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Shirt,
  ShieldCheck,
  Check,
  ArrowLeft,
  ExternalLink,
  Loader2,
  CheckCircle2,
  CreditCard,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useParams } from '../router/Router';
import { isReservedSlug, sanitizeSlug } from '../constants/reservedRoutes';
import { showToast } from '../utils/toastEmitter';
import { resolveGarmentTemplateSrc } from '../utils/textileMockupUtils';

export interface ProductShopProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export const ProductShop: React.FC<ProductShopProps> = ({ slug: propSlug, onNavigate }) => {
  const params = useParams<{ slug?: string }>();
  const rawSlug = propSlug || params?.slug || '';
  const currentSlug = sanitizeSlug(rawSlug) || 'aaronh';

  const [shopData, setShopData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<'front' | 'back'>('front');
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedProduct, setSelectedProduct] = useState<'tshirt' | 'hoodie'>('tshirt');
  const [isOrdering, setIsOrdering] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    if (!currentSlug || isReservedSlug(currentSlug)) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchShopProfile = async () => {
      try {
        let snapshot = await getDoc(doc(db, 'portals', currentSlug));
        if (!snapshot.exists()) {
          snapshot = await getDoc(doc(db, 'projects', currentSlug));
        }

        if (snapshot.exists() && isMounted) {
          setShopData(snapshot.data());
        } else if (isMounted) {
          // Fallback par défaut propre
          setShopData({
            eventName: currentSlug.toUpperCase(),
            companyName: currentSlug.toUpperCase(),
            tshirtColor: 'black',
          });
        }
      } catch (err) {
        console.warn('[ProductShop] Erreur lecture profil Firestore:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchShopProfile();
    return () => {
      isMounted = false;
    };
  }, [currentSlug]);

  const brandName = shopData?.eventName || shopData?.companyName || currentSlug.toUpperCase();
  const garmentColor = shopData?.tshirtColor || 'black';

  // RÈGLE D'OR VISUELLE : Priorité absolue aux shootings réels enregistrés (tshirtPreviewImages)
  const realShootingFront = shopData?.tshirtPreviewImages?.front;
  const realShootingBack = shopData?.tshirtPreviewImages?.back;
  const activeShooting = selectedSide === 'back' ? realShootingBack : realShootingFront;

  // Si pas de shooting réel, affichage du gabarit + logo de secours
  const fallbackTemplateSrc = resolveGarmentTemplateSrc(selectedProduct, garmentColor, selectedSide);
  const fallbackLogo = selectedSide === 'back'
    ? (shopData?.tshirtBackCustomLogo || shopData?.tshirtCustomLogo || shopData?.logoImage)
    : (shopData?.tshirtCustomLogo || shopData?.logoImage);

  const price = selectedProduct === 'tshirt' ? 39 : 79;

  const handlePlaceOrder = async () => {
    setIsOrdering(true);
    try {
      await addDoc(collection(db, 'orders'), {
        slug: currentSlug,
        brandName,
        product: selectedProduct,
        size: selectedSize,
        price,
        side: selectedSide,
        status: 'validated',
        source: 'white_label_shop',
        createdAt: serverTimestamp(),
      });
      setIsOrderPlaced(true);
      showToast('Commande validée avec succès !', 'success');
    } catch (err) {
      console.error('[ProductShop] Erreur commande:', err);
      showToast('Erreur lors de la commande.', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-3" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Chargement de la boutique officielle...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-lime-400 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo(`/${currentSlug}`)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vitrine Officielle</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800" />

            <div>
              <span className="font-mono text-xs font-bold uppercase text-white block">
                {brandName} • BOUTIQUE OFFICIELLE
              </span>
              <span className="text-[10px] font-mono text-zinc-500 block -mt-0.5">
                POWERED BY SIGNAID WHITE-LABEL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(`/hub/${currentSlug}`)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-lime-400" />
              <span>SmartLink Live</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Product View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Visual Mockup Canvas (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center shadow-2xl">
            {/* Toggle Face / Dos */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedSide('front')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedSide === 'front' ? 'bg-lime-400 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Face
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide('back')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedSide === 'back' ? 'bg-lime-400 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dos
              </button>
            </div>

            {/* RÈGLE D'OR : Priorité absolue à l'image réelle shootée */}
            {activeShooting ? (
              <img
                src={activeShooting}
                alt={`${brandName} merch ${selectedSide}`}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-8 select-none">
                <img
                  src={fallbackTemplateSrc}
                  alt={`Template ${selectedProduct} ${selectedSide}`}
                  className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                  draggable={false}
                />
                {fallbackLogo && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: selectedSide === 'back' ? '50%' : '65%',
                      top: selectedSide === 'back' ? '40%' : '35%',
                      width: selectedSide === 'back' ? '30%' : '20%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <img src={fallbackLogo} alt="Logo" className="w-full h-auto object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Badge Authenticité */}
            <div className="absolute bottom-4 left-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-lime-400/30 text-lime-400 font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COLLECTION OFFICIELLE CERTIFIÉE</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Details & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-mono uppercase font-bold text-lime-400 tracking-wider">Édition Limitée</span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mt-1">
              {brandName} {selectedProduct === 'tshirt' ? 'Streetwear Tee' : 'Heavyweight Hoodie'}
            </h1>
            <p className="text-2xl font-black font-mono text-white mt-2">{price},00 €</p>
            <p className="text-xs text-zinc-400 leading-relaxed mt-2">
              Textile premium 100% coton bio haute densité (240g/m²). Sérigraphie &amp; impression DTF haute résistance aux lavages, confectionné et imprimé en atelier.
            </p>
          </div>

          {/* Choix Produit */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase font-bold text-zinc-400 block">Produit :</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedProduct('tshirt')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  selectedProduct === 'tshirt' ? 'bg-lime-400/10 border-lime-400 text-lime-400 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>T-Shirt 240g (39€)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct('hoodie')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                  selectedProduct === 'hoodie' ? 'bg-lime-400/10 border-lime-400 text-lime-400 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>Hoodie 400g (79€)</span>
              </button>
            </div>
          </div>

          {/* Choix Taille */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase font-bold text-zinc-400 block">Taille :</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`w-11 h-11 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                    selectedSize === size ? 'bg-lime-400 text-black border-lime-400 font-black shadow-lg shadow-lime-400/20' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton de commande */}
          <div className="pt-4 border-t border-zinc-850">
            {isOrderPlaced ? (
              <div className="p-4 rounded-2xl bg-lime-400/10 border border-lime-400/30 text-lime-400 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="font-mono font-bold text-sm uppercase">Commande Enregistrée !</p>
                <p className="text-xs text-zinc-400 font-sans">
                  Votre commande {selectedProduct} ({selectedSize}) pour {brandName} a été envoyée à l'atelier Signaid.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isOrdering}
                className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-black font-mono text-sm uppercase tracking-wider transition shadow-xl shadow-lime-400/20 active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {isOrdering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Traitement sécurisé...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Commander Maintenant ({price},00 €)</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center justify-center gap-6 text-[10px] font-mono text-zinc-500 mt-4">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                <span>Livraison 48h</span>
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Paiement Sécurisé</span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Garantie Atelier DTF</span>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductShop;
