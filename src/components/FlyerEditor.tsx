import React, { useState, useEffect, useRef } from 'react';
import { flyerService, FlyerConfig, FlyerHotspot } from '../services/flyerService';
import { storage } from '../firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const FlyerEditor: React.FC = () => {
    const [config, setConfig] = useState<FlyerConfig | null>(null);
    const [activePage, setActivePage] = useState<'recto' | 'verso'>('recto');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentZone, setCurrentZone] = useState<Partial<FlyerHotspot> | null>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalActionType, setModalActionType] = useState<'url' | 'calendar'>('url');
    const [modalUrl, setModalUrl] = useState('');
    const [modalLabel, setModalLabel] = useState(''); // Ajout de l'état du label
    const [calTitle, setCalTitle] = useState('');
    const [calStart, setCalStart] = useState('');
    const [calLocation, setCalLocation] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await flyerService.getFlyerConfig();
            if (data) {
                setConfig(data);
            } else {
                // Initial Default State
                setConfig({
                    theme: {},
                    globalLink: "https://www.signaid.eu/inthedark",
                    pages: {
                        recto: { image: 'recto.png', hotspots: [] },
                        verso: { image: 'verso.png', hotspots: [] }
                    }
                });
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setStartPos({ x, y });
        setCurrentZone({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const w = x - startPos.x;
        const h = y - startPos.y;

        setCurrentZone({
            x: w < 0 ? x : startPos.x,
            y: h < 0 ? y : startPos.y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentZone || !config) return;
        setIsDrawing(false);

        if (currentZone.w! < 1 || currentZone.h! < 1) {
            setCurrentZone(null);
            return;
        }

        // Open Modal instead of prompt
        setModalUrl('');
        setModalLabel(''); // Reset du label
        setCalTitle('');
        setCalStart('');
        setCalLocation('');
        setModalActionType('url');
        setShowModal(true);
    };

    const addHotspot = () => {
        if (!currentZone || !config) return;

        let url = '';
        if (modalActionType === 'url') {
            url = modalUrl.trim() || 'https://';
        } else {
            if (!calTitle || !calStart) {
                alert("Veuillez entrer un titre et une date.");
                return;
            }
            url = generateCalendarUrl(calTitle, calStart, calLocation);
        }

        const newHotspot: FlyerHotspot = {
            id: Date.now().toString(),
            url,
            label: modalLabel.trim() ? modalLabel.trim() : undefined, // Enregistrer le label optionnel
            x: currentZone.x!,
            y: currentZone.y!,
            w: currentZone.w!,
            h: currentZone.h!
        };

        const newPages = { ...config.pages };
        newPages[activePage].hotspots.push(newHotspot);
        setConfig({ ...config, pages: newPages });
        setCurrentZone(null);
        setShowModal(false);
    };

    const generateCalendarUrl = (title: string, start: string, location: string) => {
        const d = new Date(start);
        const format = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const startStr = format(d);
        const endStr = format(new Date(d.getTime() + 60 * 60 * 1000));

        let calUrl = `https://www.google.com/calendar/render?action=TEMPLATE`;
        calUrl += `&text=${encodeURIComponent(title)}`;
        calUrl += `&dates=${startStr}/${endStr}`;
        if (location) calUrl += `&location=${encodeURIComponent(location)}`;
        return calUrl;
    };

    const deleteHotspot = (id: string) => {
        if (!config) return;
        const newPages = { ...config.pages };
        newPages[activePage].hotspots = newPages[activePage].hotspots.filter(h => h.id !== id);
        setConfig({ ...config, pages: newPages });
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await flyerService.saveFlyerConfig(config);
            alert("Configuration sauvegardée avec succès ! (Publiée)");
        } catch (err) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportJSON = () => {
        if (!config) return;
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'config_flyer.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !config) return;

        setUploadingImage(true);
        try {
            const storageRef = ref(storage, `flyers/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                () => { },
                (error) => {
                    console.error("Upload error:", error);
                    alert("Erreur lors du téléchargement de l'image.");
                    setUploadingImage(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const newPages = { ...config.pages };
                    newPages[activePage].image = downloadURL;
                    setConfig({ ...config, pages: newPages });
                    setUploadingImage(false);
                }
            );
        } catch (error) {
            console.error("Erreur:", error);
            setUploadingImage(false);
            alert("Erreur lors du téléchargement");
        }
        e.target.value = '';
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target!.result as string);
                if (!imported.pages) throw new Error("Format invalide (pages manquantes)");

                // Merge with current config to maintain structure
                setConfig(prev => ({
                    ...prev!,
                    ...imported,
                    theme: imported.theme || prev?.theme || {}
                }));
                alert("✅ Configuration importée avec succès !");
            } catch (err: any) {
                alert("❌ Erreur lors de l'import : " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const clearAllZones = () => {
        if (!config) return;
        if (!window.confirm(`Supprimer TOUTES les zones de la face ${activePage.toUpperCase()} ?`)) return;
        const newPages = { ...config.pages };
        newPages[activePage].hotspots = [];
        setConfig({ ...config, pages: newPages });
    };

    if (loading) return <div className="p-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">Chargement de l'éditeur...</div>;

    const pageData = config!.pages[activePage];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <i className="fa-solid fa-map-location-dot text-orange-500"></i> Éditeur de Flyer Dynamique
                    </h3>
                    <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden h-9">
                        <button
                            onClick={() => setActivePage('recto')}
                            className={`px-4 text-xs font-bold transition-colors ${activePage === 'recto' ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            Face RECTO
                        </button>
                        <button
                            onClick={() => setActivePage('verso')}
                            className={`px-4 text-xs font-bold transition-colors ${activePage === 'verso' ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            Face VERSO
                        </button>
                    </div>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden h-9">
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3 text-[10px] font-bold border-r hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50"
                    >
                        {uploadingImage ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-image"></i>} Changer l'image
                    </button>
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className="px-3 text-[10px] font-bold border-r hover:bg-gray-100 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-file-import"></i> Charger JSON
                    </button>
                    <input
                        type="file"
                        ref={importInputRef}
                        onChange={handleImportJSON}
                        accept=".json"
                        className="hidden"
                    />
                    <button
                        onClick={handleExportJSON}
                        className="px-3 text-[10px] font-bold hover:bg-gray-100 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-file-export"></i> Enregistrer JSON
                    </button>
                </div>

                <div className="flex flex-col items-end mr-2">
                    <label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Lien Global Flyer</label>
                    <input
                        type="text"
                        className="text-xs border-b border-gray-200 focus:border-orange-500 outline-none p-1 w-48 text-right font-medium"
                        value={config!.globalLink}
                        onChange={(e) => setConfig({ ...config!, globalLink: e.target.value })}
                        placeholder="https://..."
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    PUBLIER
                </button>
            </div>

            <div className="p-8 flex flex-col md:flex-row gap-8 bg-[#f8fafc]">
                {/* Editor Canvas */}
                <div className="flex-1 select-none">
                    <p className="text-xs text-gray-400 mb-2 italic">Glissez votre souris sur l'image pour créer une zone cliquable</p>
                    <div
                        ref={containerRef}
                        className="relative bg-white shadow-2xl rounded-lg overflow-hidden cursor-crosshair border border-gray-100"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <img
                            src={pageData.image?.startsWith('http') || pageData.image?.startsWith('data:') ? pageData.image : `/assets/flyers/${pageData.image || activePage + '.png'}`}
                            className="w-full h-auto pointer-events-none"
                            alt="Editor Preview"
                            draggable={false}
                        />

                        {/* Existing hotspots */}
                        {pageData.hotspots.map(hs => (
                            <div
                                key={hs.id}
                                className="absolute border-2 border-orange-500 bg-orange-500/20 group hover:bg-orange-500/40 transition-all flex items-center justify-center"
                                style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: `${hs.w}%`, height: `${hs.h}%` }}
                            >
                                <div className="hidden group-hover:flex items-center gap-1 bg-black/80 text-white p-1 rounded-md scale-75">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); deleteHotspot(hs.id); }}
                                        className="w-6 h-6 bg-red-500 rounded flex items-center justify-center hover:bg-red-600"
                                    >
                                        <i className="fa-solid fa-trash text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Drawing zone */}
                        {currentZone && (
                            <div
                                className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                                style={{
                                    left: `${currentZone.x}%`,
                                    top: `${currentZone.y}%`,
                                    width: `${currentZone.w}%`,
                                    height: `${currentZone.h}%`
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Hotspot List */}
                <div className="w-full md:w-80 bg-white p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                        <i className="fa-solid fa-list-ul text-gray-400"></i> Liste des Zones ({pageData.hotspots.length})
                    </h4>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                        {pageData.hotspots.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                Aucune zone sur cette face.
                            </div>
                        ) : (
                            pageData.hotspots.map((hs, idx) => (
                                <div key={hs.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-gray-400">#0{idx + 1}</span>
                                        <button
                                            onClick={() => deleteHotspot(hs.id)}
                                            className="text-gray-300 hover:text-red-500"
                                        >
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] uppercase font-bold text-gray-400">Destination</label>
                                        <input
                                            type="text"
                                            className="bg-transparent border-b border-transparent focus:border-orange-500 outline-none py-1 truncate font-medium text-gray-700"
                                            value={hs.url}
                                            onChange={(e) => {
                                                const newPages = { ...config!.pages };
                                                newPages[activePage].hotspots = newPages[activePage].hotspots.map(h =>
                                                    h.id === hs.id ? { ...h, url: e.target.value } : h
                                                );
                                                setConfig({ ...config!, pages: newPages });
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <label className="text-[9px] uppercase font-bold text-gray-400">Texte du bouton (Optionnel)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Acheter un billet"
                                            className="bg-transparent border-b border-transparent focus:border-orange-500 outline-none py-1 truncate font-medium text-gray-700 placeholder-gray-300"
                                            value={hs.label || ''}
                                            onChange={(e) => {
                                                const newPages = { ...config!.pages };
                                                newPages[activePage].hotspots = newPages[activePage].hotspots.map(h =>
                                                    h.id === hs.id ? { ...h, label: e.target.value } : h
                                                );
                                                setConfig({ ...config!, pages: newPages });
                                            }}
                                        />
                                    </div>
                                    <div className="mt-2 text-[9px] text-gray-400 font-mono">
                                        X: {hs.x.toFixed(1)}% | Y: {hs.y.toFixed(1)}%
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-6 space-y-2">
                        <button
                            onClick={clearAllZones}
                            className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                            <i className="fa-solid fa-trash-can mr-2"></i> Vider les zones
                        </button>
                        <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                            <p className="text-[10px] text-orange-700 leading-tight">
                                <i className="fa-solid fa-circle-info mr-1"></i>
                                Les changements sont immédiats dans cet aperçu mais ne seront publics qu'après avoir cliqué sur <strong>PUBLIER</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zone Creation Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                                <h4 className="font-bold text-gray-800">Configurer la zone</h4>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setModalActionType('url')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${modalActionType === 'url' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
                                    >
                                        <i className="fa-solid fa-link mr-2"></i> Lien URL
                                    </button>
                                    <button
                                        onClick={() => setModalActionType('calendar')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${modalActionType === 'calendar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
                                    >
                                        <i className="fa-solid fa-calendar-plus mr-2"></i> Google Agenda
                                    </button>
                                </div>

                                {modalActionType === 'url' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Texte du bouton (Optionnel)</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-orange-500 transition-all font-medium"
                                                placeholder="Ex: Acheter un billet"
                                                value={modalLabel}
                                                onChange={(e) => setModalLabel(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Destination (URL)</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full text-sm border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-orange-500 transition-all font-medium"
                                                placeholder="https://..."
                                                value={modalUrl}
                                                onChange={(e) => setModalUrl(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Titre de l'événement</label>
                                            <input
                                                type="text"
                                                autoFocus
                                                className="w-full text-sm border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-orange-500 transition-all font-medium"
                                                placeholder="Ex: Lancement de la collection"
                                                value={calTitle}
                                                onChange={(e) => setCalTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Date et Heure</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full text-sm border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-orange-500 transition-all font-medium"
                                                value={calStart}
                                                onChange={(e) => setCalStart(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Lieu (Optionnel)</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-orange-500 transition-all font-medium"
                                                placeholder="Ex: Paris, France"
                                                value={calLocation}
                                                onChange={(e) => setCalLocation(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t bg-gray-50 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={addHotspot}
                                    className="flex-1 py-3 text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95"
                                >
                                    Ajouter la zone
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default FlyerEditor;
