/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GeneratedPack, VisualAsset } from '../types';
import {
  Download,
  FileImage,
  Shirt,
  Smartphone,
  Square,
  Layout,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { downloadSvgAsFile, downloadSvgAsPng, setPngDpi } from '../utils/downloadHelpers';
import { ProtectedVisualVault } from './ProtectedVisualVault';
import { toPng } from 'html-to-image';

interface PackVisualsViewerProps {
  pack: GeneratedPack;
  onOpenCheckout: () => void;
  layoutMode?: 'raw' | 'embellished';
  onToggleLayoutMode?: () => void;
}

type VisualTab = 'square' | 'poster' | 'story' | 'banner' | 'tshirt';

export const PackVisualsViewer: React.FC<PackVisualsViewerProps> = ({
  pack,
  onOpenCheckout,
  layoutMode = pack.input.layoutMode || 'raw',
}) => {
  // Forçage de l'onglet actif sur 'square' (Post 1:1) par défaut
  const [activeTab, setActiveTab] = useState<VisualTab>('square');
  const [tshirtSide, setTshirtSide] = useState<'back' | 'front'>('back');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const isEmbellished = layoutMode === 'embellished';

  const getCurrentAsset = (): { title: string; asset: VisualAsset; ratioClass: string } => {
    switch (activeTab) {
      case 'poster':
        return { title: 'Affiche Événement A3 (Portrait)', asset: pack.posterVisual, ratioClass: 'aspect-[3/4]' };
      case 'story':
        return { title: 'Story Instagram / TikTok (9:16)', asset: pack.storyVisual, ratioClass: 'aspect-[9/16]' };
      case 'banner':
        return { title: 'Bannière Web (16:9)', asset: pack.bannerVisual, ratioClass: 'aspect-[16/9]' };
      case 'tshirt':
        return {
          title: tshirtSide === 'back' ? 'T-Shirt Dos Graphique (A3)' : 'T-Shirt Face Coeur (10x10cm)',
          asset: tshirtSide === 'back' ? pack.tshirtBackVisual : pack.tshirtChestVisual,
          ratioClass: tshirtSide === 'back' ? 'aspect-[3/4]' : 'aspect-square',
        };
      case 'square':
      default:
        return { title: 'Post Carré Feed (1:1 Réseaux & Points Ciblés)', asset: pack.squareVisual, ratioClass: 'aspect-square' };
    }
  };

  const current = getCurrentAsset();

  const handleDownloadSvg = () => {
    if (!pack.isUnlocked) {
      onOpenCheckout();
      return;
    }
    const filename = `${pack.input.eventName.replace(/\s+/g, '_')}_${activeTab}`;
    downloadSvgAsFile(current.asset.svgContent, filename);
  };

  const handleDownloadPng = async () => {
    if (!pack.isUnlocked) {
      onOpenCheckout();
      return;
    }
    setIsExporting(true);
    const filename = `${pack.input.eventName.replace(/\s+/g, '_') || 'Event'}_${activeTab}.png`;

    try {
      const containerNode = document.querySelector('.relative.group.min-h-\\[460px\\]') || document.querySelector('svg');

      if (containerNode) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const targetNode = containerNode.querySelector('svg') || containerNode;

        const dataUrl = await toPng(targetNode as HTMLElement, {
          cacheBust: true,
          includeQueryParams: true,
          pixelRatio: 2,
          quality: 1.0,
        });

        const finalPngUrl = setPngDpi(dataUrl, 300);

        const link = document.createElement('a');
        link.href = finalPngUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Erreur lors de la capture :', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllFormats = () => {
    if (!pack.isUnlocked) {
      onOpenCheckout();
      return;
    }

    setIsExportingAll(true);
    const baseName = pack.input.eventName.replace(/\s+/g, '_') || 'Event';

    try {
      downloadSvgAsPng(pack.squareVisual.svgContent, `${baseName}_Post_Square`, 3600, 3600, 300);
      setTimeout(() => {
        downloadSvgAsPng(pack.posterVisual.svgContent, `${baseName}_Affiche_A3`, 3508, 4960, 300);
      }, 300);
      setTimeout(() => {
        downloadSvgAsPng(pack.storyVisual.svgContent, `${baseName}_Story_9_16`, 2160, 3840, 300);
      }, 600);
      setTimeout(() => {
        downloadSvgAsPng(pack.bannerVisual.svgContent, `${baseName}_Banner_16_9`, 3840, 2160, 300);
      }, 900);
    } catch (err) {
      console.error('Erreur export global :', err);
    } finally {
      setTimeout(() => setIsExportingAll(false), 1200);
    }
  };

  const tshirtBgColor = pack.input.tshirtColor === 'white' ? '#f4f4f6' : '#0e1015';

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4">
      {/* Barre supérieure : Titre et Sélecteur de Formats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white font-['Syne'] uppercase tracking-wider flex items-center gap-2">
            <span>Aperçu Immédiat de la Composition</span>
            <span className="text-[10px] text-zinc-400 font-mono normal-case">
              ({current.title})
            </span>
          </h3>
          <p className="text-[11px] text-zinc-400">
            Composition dynamique en temps réel. Le format carré 1:1 est priorisé pour l'ancrage de vos points ciblés et tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pack.isUnlocked && (
            <button
              type="button"
              onClick={handleDownloadAllFormats}
              disabled={isExportingAll}
              className="px-3 py-1.5 rounded-xl bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isExportingAll ? 'Export en cours...' : '📦 Tout Télécharger (4 Formats)'}</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {isEmbellished ? '✨ Rendu Studio Pro' : '📄 Montage Brut'}
          </span>
        </div>
      </div>

      {/* Sélecteur de formats horizontal : Post 1:1 en PREMIER (tout à gauche) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        <button
          id="tab-view-square"
          type="button"
          onClick={() => setActiveTab('square')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'square'
            ? 'bg-cyan-500 text-zinc-950 shadow-md font-black'
            : 'bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800'
            }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>Post 1:1 (Carré)</span>
        </button>

        <button
          id="tab-view-poster"
          type="button"
          onClick={() => setActiveTab('poster')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'poster'
            ? 'bg-lime-400 text-zinc-950 shadow-sm'
            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
        >
          <FileImage className="w-3.5 h-3.5" />
          <span>Affiche A3</span>
        </button>

        <button
          id="tab-view-story"
          type="button"
          onClick={() => setActiveTab('story')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'story'
            ? 'bg-lime-400 text-zinc-950 shadow-sm'
            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Story 9:16</span>
        </button>

        <button
          id="tab-view-banner"
          type="button"
          onClick={() => setActiveTab('banner')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'banner'
            ? 'bg-lime-400 text-zinc-950 shadow-sm'
            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Bannière 16:9</span>
        </button>

        <button
          id="tab-view-tshirt"
          type="button"
          onClick={() => setActiveTab('tshirt')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'tshirt'
            ? 'bg-lime-400 text-zinc-950 shadow-sm'
            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>Merch T-Shirt</span>
        </button>
      </div>

      {/* Bascule Dos / Face si onglet T-shirt « 👕 Face ➔ Dos » */}
      {activeTab === 'tshirt' && (
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-fit self-center shadow-lg">
          <button
            type="button"
            onClick={() => setTshirtSide('front')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tshirtSide === 'front' ? 'bg-lime-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
          >
            <span>👕</span>
            <span>Face Cœur (10x10 cm)</span>
          </button>
          <button
            type="button"
            onClick={() => setTshirtSide((s) => (s === 'front' ? 'back' : 'front'))}
            className="text-zinc-500 hover:text-lime-400 px-1 text-xs transition cursor-pointer select-none"
            title="Inverser la vue Face / Dos"
          >
            ➔
          </button>
          <button
            type="button"
            onClick={() => setTshirtSide('back')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tshirtSide === 'back' ? 'bg-lime-400 text-zinc-950 font-black shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
          >
            <span>Dos Graphique (A3S)</span>
          </button>
        </div>
      )}

      {/* ZONE D'AFFICHAGE DU VISUEL IMMÉDIAT */}
      <div className="w-full flex justify-center bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 overflow-hidden relative group min-h-[460px]">
        <div className="w-full max-w-[500px] flex items-center justify-center">
          <ProtectedVisualVault
            asset={current.asset}
            isUnlocked={!!pack.isUnlocked}
            activeTab={activeTab}
            tshirtSide={tshirtSide}
            tshirtBgColor={tshirtBgColor}
            onOpenCheckout={onOpenCheckout}
          />
        </div>
      </div>

      {/* Barre d'Actions et Téléchargements */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Résolution native : Vecteur 300 DPI (sRGB &amp; CMJN)</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-download-svg"
            type="button"
            onClick={handleDownloadSvg}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-lime-400" />
            <span>Télécharger .SVG</span>
          </button>

          <button
            id="btn-download-png"
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPng}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition border border-zinc-700 flex items-center justify-center gap-1.5"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileImage className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Télécharger .PNG</span>
          </button>

          <button
            id="btn-order-from-viewer"
            type="button"
            onClick={onOpenCheckout}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-lime-400/20 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Débloquer le Pack</span>
          </button>
        </div>
      </div>
    </div>
  );
};