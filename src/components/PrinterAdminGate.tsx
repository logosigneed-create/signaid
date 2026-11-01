/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai / Signaid - Cockpit Passif de Trésorerie & Suivi Automatisé (Ex-PrinterAdminGate)
 * ZÉRO ARTISANAT : Suivi passif des marges nettes, statut d'usine en temps réel,
 * et déblocage exclusif des commandes avec option "Refonte Logo Créative".
 */

import React, { useState, useEffect, useMemo } from 'react';
import { OrderRecord } from '../types';

export interface PrinterAdminGateProps {
  orders?: OrderRecord[];
  onClose?: () => void;
  onUpdateOrder?: (orderId: string, updates: Partial<OrderRecord>) => void;
  isOpen?: boolean;
  [key: string]: any;
}

interface UnifiedOrderItem {
  id: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  packageType: string;
  quantity: number;
  tshirtSize: string;
  tshirtColor: string;
  totalEur: number;
  netMarginEur: number;
  status: 'in_production' | 'dispatched' | 'awaiting_logo_redesign' | 'sent_by_email';
  trackingNumber?: string;
  trackingUrl?: string;
  printAssetUrl?: string;
  hasLogoRedesign?: boolean;
}

// Barème de marge nette estimée (Prix encaissé moins coût atelier & livraison marque blanche)
function computeNetMargin(pkgType: string, totalEur: number, hasLogoRedesign?: boolean): { gross: number; net: number } {
  let gross = totalEur;
  let net = 0;

  if (pkgType === 'box_merch_50') {
    gross = gross || 690;
    // Sur 690€ (50 t-shirts), coût atelier + port ~ 290€ -> Marge nette pure : ~400€
    net = 400;
  } else if (pkgType === 'physical_merch_pack') {
    gross = gross || 59;
    // Sur 59€ (Pack Pro + 1 T-shirt DTF), coût atelier + port ~ 15€ -> Marge nette : ~44€
    net = 44;
  } else if (pkgType === 'pack_activation_flyers_a6_500' || pkgType === 'activation_pack_500') {
    gross = gross || 49;
    // Sur 49€ (500 flyers A6), coût impression + port ~ 19€ -> Marge nette : ~30€
    net = 30;
  } else {
    gross = gross || 29;
    net = Math.round(gross * 0.92);
  }

  if (hasLogoRedesign) {
    // Ton exception créative est purement de la marge nette (100% valeur intellectuelle)
    net += 90;
  }

  return { gross, net };
}

export const PrinterAdminGate: React.FC<PrinterAdminGateProps> = ({
  orders: propOrders = [],
  onClose,
  isOpen = true,
}) => {
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [monthlyTargetEur, setMonthlyTargetEur] = useState<number>(2200);
  const [logoUploadByOrder, setLogoUploadByOrder] = useState<Record<string, string>>({});
  const [releasingOrderId, setReleasingOrderId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchServerLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders-ledger');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.orders)) {
          setServerOrders(data.orders);
        }
      }
    } catch (_err) {
      // Silencieux si serveur hors-ligne
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServerLedger();
      const timer = setInterval(fetchServerLedger, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Fusion sans doublon entre les commandes serveur (orders-db.json) et d'éventuelles commandes passées en props
  const unifiedOrders: UnifiedOrderItem[] = useMemo(() => {
    const map = new Map<string, UnifiedOrderItem>();

    const normalize = (raw: any): UnifiedOrderItem => {
      const id = raw.id || raw.orderId || `ORD-${Date.now()}`;
      const pkg = raw.packageType || raw.product || 'physical_merch_pack';
      const hasRedesign = Boolean(raw.hasLogoRedesign);
      const { gross, net } = computeNetMargin(pkg, Number(raw.totalEur || 0), hasRedesign);

      let normalizedStatus: UnifiedOrderItem['status'] = 'in_production';
      if (raw.status === 'dispatched') normalizedStatus = 'dispatched';
      else if (raw.status === 'awaiting_logo_redesign' || hasRedesign) normalizedStatus = 'awaiting_logo_redesign';
      else if (raw.status === 'sent_by_email') normalizedStatus = 'sent_by_email';

      return {
        id,
        createdAt: raw.createdAt || raw.metadata?.timestamp || new Date().toISOString(),
        customerName: raw.customerName || raw.shipping?.recipientName || 'Client Artiste / Club',
        customerEmail: raw.customerEmail || raw.shipping?.email || '',
        packageType: pkg,
        quantity: Number(raw.tshirtQty || raw.quantity || (pkg === 'box_merch_50' ? 50 : 1)),
        tshirtSize: raw.tshirtSize || raw.textileSpecs?.tshirtSize || 'L',
        tshirtColor: raw.tshirtColor || raw.textileSpecs?.tshirtColor || 'black',
        totalEur: gross,
        netMarginEur: net,
        status: normalizedStatus,
        trackingNumber: raw.trackingNumber,
        trackingUrl: raw.trackingUrl,
        printAssetUrl: raw.printAssetUrl,
        hasLogoRedesign: hasRedesign,
      };
    };

    for (const item of propOrders) {
      const norm = normalize(item);
      map.set(norm.id, norm);
    }
    for (const item of serverOrders) {
      const norm = normalize(item);
      map.set(norm.id, norm);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [propOrders, serverOrders]);

  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let netProfit = 0;
    let inProductionCount = 0;
    let dispatchedCount = 0;
    let redesignWaitingCount = 0;

    for (const o of unifiedOrders) {
      grossRevenue += o.totalEur;
      netProfit += o.netMarginEur;
      if (o.status === 'dispatched') dispatchedCount++;
      else if (o.status === 'awaiting_logo_redesign') redesignWaitingCount++;
      else inProductionCount++;
    }

    const freedomProgressPct = Math.min(100, Math.round((netProfit / Math.max(1, monthlyTargetEur)) * 100));
    const remainingBoxes50 = Math.max(0, Math.ceil((monthlyTargetEur - netProfit) / 400));
    const remainingUnitPacks = Math.max(0, Math.ceil((monthlyTargetEur - netProfit) / 44));

    return {
      grossRevenue,
      netProfit,
      inProductionCount,
      dispatchedCount,
      redesignWaitingCount,
      freedomProgressPct,
      remainingBoxes50,
      remainingUnitPacks,
    };
  }, [unifiedOrders, monthlyTargetEur]);

  const handleLogoFileChange = (orderId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUploadByOrder((prev) => ({ ...prev, [orderId]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReleaseRedesignOrder = async (orderId: string) => {
    const newLogo = logoUploadByOrder[orderId];
    if (!newLogo) return;
    setReleasingOrderId(orderId);
    try {
      const res = await fetch('/api/admin/release-logo-redesign-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newLogoBase64OrUrl: newLogo }),
      });
      if (res.ok) {
        await fetchServerLedger();
      }
    } catch (_e) {
      // pass
    } finally {
      setReleasingOrderId(null);
    }
  };

  const triggerTestOrder = async (type: 'physical_merch_pack' | 'box_merch_50') => {
    setSimulating(true);
    try {
      await fetch('/api/test/simulate-stripe-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          customerName: type === 'box_merch_50' ? 'Club Phoenix Floreffe' : 'DJ D-Fazz',
          tshirtSize: 'XL',
        }),
      });
      await fetchServerLedger();
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 7, 12, 0.92)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '24px',
      color: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* EN-TÊTE DU COCKPIT PASSIF */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1f2937',
          paddingBottom: '18px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: '#ff6b00',
                color: '#000',
                fontWeight: 800,
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
              }}>
                ZÉRO ARTISANAT // PIPELINE ACTIF
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                {loading ? 'Synchronisation...' : 'Connecté à orders-db.json & Atelier Local'}
              </span>
            </div>
            <h1 style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: 800 }}>
              Cockpit Passif de Trésorerie & Flux Usine
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => triggerTestOrder('physical_merch_pack')}
              disabled={simulating}
              style={{
                background: '#1f2937',
                color: '#ff6b00',
                border: '1px solid #374151',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Simuler Vente Unitaire (59€)
            </button>
            <button
              onClick={() => triggerTestOrder('box_merch_50')}
              disabled={simulating}
              style={{
                background: '#1f2937',
                color: '#00f0ff',
                border: '1px solid #374151',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Simuler Box Club 50x (690€)
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fermer ✕
              </button>
            )}
          </div>
        </div>

        {/* JAUGE DE SORTIE D'INTÉRIM */}
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '22px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#ff6b00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎯 Jauge d'Indépendance Financière (Sortie d'Intérim)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                Marge nette cumulée dans ta poche (après déduction automatique du coût façonnier & expédition).
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Cible nette mensuelle (€) :</span>
              <input
                type="number"
                value={monthlyTargetEur}
                onChange={(e) => setMonthlyTargetEur(Number(e.target.value) || 2000)}
                style={{
                  width: '90px',
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{
            width: '100%',
            height: '18px',
            background: '#1f2937',
            borderRadius: '999px',
            overflow: 'hidden',
            margin: '16px 0 12px 0',
            border: '1px solid #374151',
          }}>
            <div style={{
              width: `${metrics.freedomProgressPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ea580c 0%, #ff6b00 100%)',
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d1d5db', flexWrap: 'wrap', gap: '8px' }}>
            <span>
              Progression : <strong style={{ color: '#ff6b00' }}>{metrics.netProfit} € nets</strong> / {monthlyTargetEur} € ({metrics.freedomProgressPct}%)
            </span>
            <span>
              Reste à closer ce mois-ci :{' '}
              <strong style={{ color: '#00f0ff' }}>{metrics.remainingBoxes50} Box Club (50p)</strong> ou{' '}
              <strong style={{ color: '#fff' }}>{metrics.remainingUnitPacks} Packs Artiste</strong>
            </span>
          </div>
        </div>

        {/* CARTES KPI */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Chiffre d'Affaires Brut</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '6px' }}>{metrics.grossRevenue} €</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{unifiedOrders.length} commande(s) traitée(s)</div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#ff6b00', textTransform: 'uppercase' }}>Marge Nette Pure (Nicolas)</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ff6b00', marginTop: '6px' }}>+{metrics.netProfit} €</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>0 min de travail manuel logistique</div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#00f0ff', textTransform: 'uppercase' }}>En Presse chez l'Atelier</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#00f0ff', marginTop: '6px' }}>{metrics.inProductionCount}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Bons 300 DPI transmis automatiquement</div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#22c55e', textTransform: 'uppercase' }}>Colis Expédiés par l'Atelier</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e', marginTop: '6px' }}>{metrics.dispatchedCount}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Validés via le lien 1-clic imprimeur</div>
          </div>
        </div>

        {/* REGISTRE PASSIF DES COMMANDES */}
        <div style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1f2937',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              Journal d'Exécution Automatique des Commandes
            </h3>
            <button
              onClick={fetchServerLedger}
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ↻ Actualiser
            </button>
          </div>

          {unifiedOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Aucune commande enregistrée. Clique sur <strong>« + Simuler Vente »</strong> en haut à droite pour voir le pipeline en action.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#090d16', color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ padding: '12px 16px' }}>Commande / Date</th>
                    <th style={{ padding: '12px 16px' }}>Artiste / Club</th>
                    <th style={{ padding: '12px 16px' }}>Produit & Specs</th>
                    <th style={{ padding: '12px 16px' }}>Marge Nette</th>
                    <th style={{ padding: '12px 16px' }}>Statut Automatique</th>
                    <th style={{ padding: '12px 16px' }}>Master 300 DPI / Suivi</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedOrders.map((ord) => (
                    <tr key={ord.id} style={{ borderTop: '1px solid #1f2937' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{ord.id}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {new Date(ord.createdAt).toLocaleString('fr-BE')}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ord.customerEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: '#1f2937',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}>
                          {ord.quantity}x {ord.packageType}
                        </span>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                          Taille {ord.tshirtSize} • Couleur {ord.tshirtColor}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#ff6b00', fontSize: '14px' }}>+{ord.netMarginEur} € net</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Encaissé : {ord.totalEur} €</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {ord.status === 'dispatched' && (
                          <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '11px' }}>
                            ✅ EXPÉDIÉ PAR L'ATELIER
                          </span>
                        )}
                        {ord.status === 'in_production' && (
                          <span style={{ background: 'rgba(0,240,255,0.12)', color: '#00f0ff', padding: '4px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '11px' }}>
                            ⚙️ EN PRODUCTION ATELIER
                          </span>
                        )}
                        {ord.status === 'awaiting_logo_redesign' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '4px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '11px', display: 'inline-block' }}>
                              🎨 PAUSE : REFONTE LOGO NICOLAS
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/svg+xml"
                              onChange={(e) => handleLogoFileChange(ord.id, e.target.files?.[0] || null)}
                              style={{ fontSize: '11px', color: '#d1d5db' }}
                            />
                            {logoUploadByOrder[ord.id] && (
                              <button
                                onClick={() => handleReleaseRedesignOrder(ord.id)}
                                disabled={releasingOrderId === ord.id}
                                style={{
                                  background: '#fbbf24',
                                  color: '#000',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                {releasingOrderId === ord.id ? 'Compilation 300 DPI...' : '🚀 Valider Logo & Envoyer à l’Atelier'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {ord.printAssetUrl && (
                            <a
                              href={ord.printAssetUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
                            >
                              🔍 Voir Master 300 DPI
                            </a>
                          )}
                          {ord.trackingNumber ? (
                            <a
                              href={ord.trackingUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#22c55e', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
                            >
                              📦 Tracking : {ord.trackingNumber}
                            </a>
                          ) : (
                            <a
                              href={`/api/printer/confirm-dispatch?orderId=${encodeURIComponent(ord.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#9ca3af', textDecoration: 'underline', fontSize: '11px' }}
                            >
                              Lien 1-Clic Atelier
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrinterAdminGate;