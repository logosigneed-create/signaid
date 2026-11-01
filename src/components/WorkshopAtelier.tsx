import React, { useState, useEffect } from 'react';
import { OrderRecord } from '../types';
import {
  Scissors,
  Flame,
  CheckCircle,
  Truck,
  Download,
  Clock,
  Printer,
  FileCheck,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { downloadSvgAsFile } from '../utils/downloadHelpers';

interface WorkshopAtelierProps {
  orders: OrderRecord[];
  onUpdateStatus: (orderId: string, newStatus: OrderRecord['status']) => void;
}

export const WorkshopAtelier: React.FC<WorkshopAtelierProps> = ({ orders, onUpdateStatus }) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(orders[0] || null);

  // Thermal Press Timer State (15 seconds standard DTF press)
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playPressBeep();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const startTimer = () => {
    if (timerSeconds === 0) setTimerSeconds(15);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(15);
  };

  const playPressBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('AudioContext not allowed or not supported yet');
    }
  };

  // Filter physical merch orders only
  const physicalOrders = orders.filter((o) => o.packageType === 'physical_merch_pack');

  return (
    <div className="space-y-6">
      {/* Atelier Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Syne'] tracking-tight">
                Atelier d'Impression &amp; Presse DTF
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              "Tu reçois le fichier prêt à découper. Tu n'as plus qu'à presser le t-shirt (la seule action manuelle)."
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">À Presser</div>
              <div className="text-lg font-black text-zinc-200">
                {physicalOrders.filter((o) => o.status === 'to_press').length}
              </div>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Pressés</div>
              <div className="text-lg font-black text-lime-400">
                {physicalOrders.filter((o) => o.status === 'pressed').length}
              </div>
            </div>
            <div className="w-[1px] h-8 bg-zinc-800" />
            <div className="text-center px-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Expédiés</div>
              <div className="text-lg font-black text-lime-400">
                {physicalOrders.filter((o) => o.status === 'dispatched').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Orders Queue & Active Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Orders Queue (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3 flex items-center gap-2">
            <Printer className="w-4 h-4 text-lime-400" />
            <span>File d'Attente T-Shirts Merch</span>
          </h3>

          {physicalOrders.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Aucune commande physique en attente pour le moment.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {physicalOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    id={`order-card-${order.id}`}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border-lime-400 ring-1 ring-lime-400 shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{order.id}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          order.status === 'to_press'
                            ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : order.status === 'pressed'
                            ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                            : 'bg-lime-950/40 text-lime-400 border border-lime-500/30'
                        }`}
                      >
                        {order.status === 'to_press'
                          ? 'À Presser'
                          : order.status === 'pressed'
                          ? 'Pressé'
                          : 'Expédié'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-bold text-zinc-200 truncate">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {(order.packSnapshot as any)?.input?.eventName ||
                        (order.packSnapshot as any)?.eventName ||
                        'Soirée DJ'}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>Taille : <strong className="text-lime-400">{order.tshirtSize || 'L'}</strong></span>
                      <span>Couleur : {order.tshirtColor || 'Noir'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Order Workshop Station (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrder ? (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-white">{selectedOrder.id}</span>
                    <span className="text-xs text-zinc-400">• Commandé par {selectedOrder.customerName}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Événement :{' '}
                    <strong className="text-white">
                      {(selectedOrder.packSnapshot as any)?.input?.eventName ||
                        (selectedOrder.packSnapshot as any)?.eventName ||
                        'Pack Merch'}
                    </strong>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'to_press' && (
                    <button
                      id="btn-mark-pressed"
                      onClick={() => onUpdateStatus(selectedOrder.id, 'pressed')}
                      className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-lime-400/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Marquer Pressé</span>
                    </button>
                  )}

                  {selectedOrder.status === 'pressed' && (
                    <button
                      id="btn-mark-dispatched"
                      onClick={() => onUpdateStatus(selectedOrder.id, 'dispatched')}
                      className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-lime-400/20"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Expédier le Colis</span>
                    </button>
                  )}

                  {selectedOrder.status === 'dispatched' && (
                    <span className="px-3 py-1.5 rounded-xl bg-lime-500/20 text-lime-400 text-xs font-bold flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      <span>Colis en Route</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Thermal Press Timer & Specs Widget */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Timer Box */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                      <Flame className="w-4 h-4 text-lime-400" />
                      <span>Chronomètre Presse DTF</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-500/20 text-lime-400">
                      155°C / 15 SEC
                    </span>
                  </div>

                  {/* Big Digital Countdown */}
                  <div className="my-4 text-center">
                    <div
                      className={`text-5xl sm:text-6xl font-black font-mono tracking-tighter ${
                        timerSeconds === 0
                          ? 'text-lime-400 animate-bounce'
                          : isTimerRunning
                          ? 'text-lime-400'
                          : 'text-white'
                      }`}
                    >
                      00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {timerSeconds === 0
                        ? '🔥 PRESSAGE TERMINÉ ! Prêt pour pelage à chaud.'
                        : isTimerRunning
                        ? 'En cours de pressage thermique...'
                        : 'Actionne la presse dès que le film DTF est positionné.'}
                    </p>
                  </div>

                  {/* Timer Controls */}
                  <div className="flex gap-2">
                    <button
                      id="btn-timer-start"
                      onClick={startTimer}
                      disabled={isTimerRunning}
                      className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Lancer Presse (15s)</span>
                    </button>
                    <button
                      id="btn-timer-reset"
                      onClick={resetTimer}
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                      title="Réinitialiser"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Print Directives Card */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
                    <FileCheck className="w-4 h-4 text-lime-400" />
                    <span>Fiche d'Atelier Textile</span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Taille demandée :</span>
                    <strong className="text-white font-mono text-sm">{selectedOrder.tshirtSize || 'L'}</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Coloris t-shirt :</span>
                    <strong className="text-white">{selectedOrder.tshirtColor || 'Noir Vintage'}</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Température de consigne :</span>
                    <strong className="text-lime-400 font-mono">155°C - 160°C</strong>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Pelage film :</span>
                    <strong className="text-lime-400">Chaud immédiat (Hot Peel)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Adresse d'envoi :</span>
                    <span className="text-zinc-200 text-right truncate max-w-[200px]">
                      {selectedOrder.shippingAddress || 'Remise en main propre club'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fichier Prêt à Découper Preview */}
              <div className="mt-6 pt-5 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-lime-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Fichier Vectoriel Prêt à Découper (Roland / Cricut / DTF)
                    </span>
                  </div>

                  <button
                    id="btn-download-cut-vector"
                    onClick={() => {
                      const svg =
                        selectedOrder.packSnapshot?.printCutFile?.svgCutFile ||
                        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><text x="200" y="200" text-anchor="middle">DROPPER CUT FILE</text></svg>`;
                      downloadSvgAsFile(svg, `CUT_READY_${selectedOrder.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-lime-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Vecteur (.SVG)</span>
                  </button>
                </div>

                {/* SVG Visual Frame */}
                <div className="w-full bg-white rounded-2xl p-4 border-2 border-dashed border-zinc-800 max-h-72 overflow-hidden flex items-center justify-center">
                  <div
                    className="w-full h-full max-w-[360px] aspect-[3/4]"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedOrder.packSnapshot?.printCutFile?.svgCutFile ||
                        `<div class="text-zinc-800 font-mono text-center p-8">TRACÉ VECTORIEL DTF PRÊT</div>`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-400">
              Sélectionne une commande à gauche pour afficher son fichier prêt à découper.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
