/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { EventInput, createBlankEventInput, SE_FAIRE_ENTENDRE_PROJECT } from '../types';
import {
    FolderOpen,
    Save,
    Trash2,
    X,
    Clock,
    Sparkles,
    Download,
    Check,
    Plus,
} from 'lucide-react';
import { getConfiguredAdminEmail } from '../utils/adminAuth';
import { db, auth } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toastEmitter';
import {
    cleanProjectForSerialization,
    hasBase64Images,
    buildFirestoreProjectDoc,
    safeSaveProjectToLocalStorage,
    sanitizeProjectForLocalStorage,
    guardFirestorePayloadSize,
    pruneHeavyPayloadForFirestore,
    isFirestoreDocumentSizeError,
} from '../utils/storageSanitizer';
import {
    saveProjectToIndexedDB,
    getAllProjectsFromIndexedDB,
    deleteProjectFromIndexedDB,
} from '../utils/indexedDbStorage';

export interface SavedProject {
    id: string;
    name: string;
    updatedAt: any;
    status?: string;
    input: EventInput;
    updatedAtMillis?: number;
    createdAt?: any;
    flyerImageUrl?: string;
}

export const formatProjectDate = (val: any): string => {
    if (!val) return '';
    // Cas Date natif
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? '' : val.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    // Cas Firestore Timestamp instance (.toDate())
    if (typeof val.toDate === 'function') {
        return val.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    // Cas Firestore Timestamp sérialisé ({ seconds, nanoseconds })
    if (typeof val.seconds === 'number') {
        return new Date(val.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    // Cas timestamp millisecondes ou chaîne ISO
    if (typeof val === 'number' || typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
    return '';
};

export const getProjectTimestampMillis = (val: any): number => {
    if (!val) return 0;
    if (typeof val.toDate === 'function') {
        return val.toDate().getTime();
    }
    if (typeof val.seconds === 'number') {
        return val.seconds * 1000;
    }
    if (val instanceof Date) {
        return val.getTime();
    }
    if (typeof val === 'number') {
        return val;
    }
    if (typeof val === 'string') {
        const t = new Date(val).getTime();
        return isNaN(t) ? 0 : t;
    }
    return 0;
}

interface ProjectManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInput: EventInput;
    onLoadProject: (input: EventInput) => void;
}

const STORAGE_KEY = 'droppaid_admin_projects_v1';

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
    isOpen,
    onClose,
    currentInput,
    onLoadProject,
}) => {
    const { user, entitlements } = useAuth();
    const effectiveEmail = auth.currentUser?.email || user?.email || entitlements?.email || '';
    const currentUser = auth.currentUser || user || (effectiveEmail && effectiveEmail !== 'invite@client.fr' ? {
        uid: 'user_' + effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        email: effectiveEmail,
    } : null);
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [projectName, setProjectName] = useState<string>(
        `${currentInput.eventName || 'LIVE'} - ${currentInput.djName || 'D OKIIN'}`
    );
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Chargement instantané depuis le stockage de secours local (LocalStorage + IndexedDB)
    // puis écoute Firestore temps réel si connecté
    useEffect(() => {
        if (!isOpen) return;

        // 1. ÉTAPE IMMÉDIATE : Remplir l'interface avec les projets stockés localement et dans IndexedDB
        const loadBackupProjects = async () => {
            let localList: SavedProject[] = [];
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        localList = parsed.map((item: any) => {
                            const cleanInput = cleanProjectForSerialization(item.input || item);
                            delete (cleanInput as any).input;
                            return {
                                ...item,
                                updatedAt: formatProjectDate(item.updatedAt || item.updatedAtMillis || item.createdAt) || 'Récemment',
                                updatedAtMillis: item.updatedAtMillis || getProjectTimestampMillis(item.updatedAt || item.createdAt) || Date.now(),
                                input: cleanInput as unknown as EventInput,
                            };
                        });
                    }
                }
            } catch (e) {
                console.warn('[ProjectManagerModal] Erreur lecture localStorage :', e);
            }

            try {
                const idbList = await getAllProjectsFromIndexedDB();
                if (Array.isArray(idbList) && idbList.length > 0) {
                    const idbMapped: SavedProject[] = idbList.map((item: any) => {
                        const cleanInput = cleanProjectForSerialization(item.input || item);
                        delete (cleanInput as any).input;
                        const formattedDate = formatProjectDate(item.updatedAt || item.updatedAtMillis || item.createdAt) || new Date(item.updatedAtMillis || Date.now()).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                        return {
                            id: item.id || item.projectId,
                            name: item.eventName || item.title || item.name || 'Projet Récupéré',
                            updatedAt: formattedDate,
                            updatedAtMillis: item.updatedAtMillis || getProjectTimestampMillis(item.updatedAt || item.createdAt) || Date.now(),
                            status: item.status || 'Actif',
                            input: cleanInput as unknown as EventInput,
                        };
                    });

                    // Fusionner sans doublons par ID
                    const existingIds = new Set(localList.map((p) => p.id));
                    for (const proj of idbMapped) {
                        if (!existingIds.has(proj.id)) {
                            localList.push(proj);
                        }
                    }
                }
            } catch (e) {
                console.warn('[ProjectManagerModal] Erreur lecture IndexedDB :', e);
            }

            const currentIds = new Set(localList.map((p) => p.id));
            if (!currentIds.has('proj_se_faire_entendre')) {
                localList.unshift({
                    id: 'proj_se_faire_entendre',
                    name: 'SE FAIRE ENTENDRE - SIGNAID',
                    updatedAt: 'Modèle Officiel',
                    updatedAtMillis: Date.now() - 500,
                    status: 'Modèle Officiel',
                    input: SE_FAIRE_ENTENDRE_PROJECT,
                    flyerImageUrl: '/assets/decor-ville-futuriste.jpg',
                });
            }

            localList.sort((a, b) => (b.updatedAtMillis || 0) - (a.updatedAtMillis || 0));
            setProjects(localList);
        };

        void loadBackupProjects();

        if (!currentUser?.uid) return;

        // 2. ÉTAPE CLOUD : Écoute temps réel Firestore avec repli transparent si indisponible (502 / quota / offline)
        const q = query(
            collection(db, 'projects'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const firestoreProjects: SavedProject[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();

                    const rawDate = data.updatedAt ?? data.createdAt;
                    let formattedDate = formatProjectDate(rawDate) || 'Récemment';
                    let updatedAtMillis = getProjectTimestampMillis(rawDate);

                    if (data.updatedAt?.toDate) {
                        const d = data.updatedAt.toDate();
                        updatedAtMillis = d.getTime();
                        formattedDate = d.toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    } else if (typeof data.updatedAt === 'string') {
                        formattedDate = data.updatedAt;
                        const parsed = new Date(data.updatedAt).getTime();
                        if (!isNaN(parsed)) updatedAtMillis = parsed;
                    } else if (data.updatedAt instanceof Date) {
                        updatedAtMillis = data.updatedAt.getTime();
                        formattedDate = data.updatedAt.toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    }

                    // Assainissement strict pour briser toute imbrication récursive 'input.input'
                    const sourceInput = data.input || data;
                    const cleanItemInput = cleanProjectForSerialization(sourceInput);
                    delete (cleanItemInput as any).input;

                    const projectInput: EventInput = {
                        ...(sourceInput as EventInput),
                        ...(cleanItemInput as unknown as EventInput),
                        id: docSnap.id,
                        projectId: docSnap.id,
                        eventName: data.eventName || data.title || cleanItemInput.eventName || 'Nouveau Projet',
                        djName: data.djName || cleanItemInput.djName || '',
                    };
                    delete (projectInput as any).input;

                    firestoreProjects.push({
                        id: docSnap.id,
                        name: data.eventName || data.title || projectInput.eventName || 'Nouveau Projet',
                        updatedAt: formattedDate,
                        updatedAtMillis,
                        status: data.status || 'Actif',
                        input: projectInput,
                    });
                });

                firestoreProjects.sort((a, b) => (b.updatedAtMillis || 0) - (a.updatedAtMillis || 0));

                if (firestoreProjects.length > 0) {
                    setProjects((prev) => {
                        // Conserver les projets locaux récents qui n'auraient pas encore synchronisé
                        const remoteIds = new Set(firestoreProjects.map((p) => p.id));
                        const localOnly = prev.filter((p) => !remoteIds.has(p.id));
                        const merged = [...firestoreProjects, ...localOnly];
                        merged.sort((a, b) => (b.updatedAtMillis || 0) - (a.updatedAtMillis || 0));
                        try {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                        } catch {}
                        return merged;
                    });
                }
            },
            (err: any) => {
                const isPermOrQuota =
                    err?.code === 'permission-denied' ||
                    err?.code === 'resource-exhausted' ||
                    (typeof err?.message === 'string' && (
                        err.message.includes('permission') ||
                        err.message.includes('quota') ||
                        err.message.includes('502') ||
                        err.message.includes('network')
                    ));
                console.warn('[ProjectManagerModal] Sync Firestore indisponible, utilisation du cache local & IndexedDB :', err?.message || err);
                void loadBackupProjects();
            }
        );

        return () => unsubscribe();
    }, [currentUser?.uid, isOpen]);

    if (!isOpen) return null;

    // Sauvegarder le projet actuel
    const handleSaveCurrent = async () => {
        if (!projectName.trim()) return;

        const newId = `proj_${Date.now()}`;
        const nowMillis = Date.now();
        const formattedDate = new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        // 1. Assainir l'objet projet (sans imbrications circulaires ni champ input imbriqué)
        const cleanBase = cleanProjectForSerialization(currentInput);
        delete (cleanBase as any).input;

        const newProjectInput: EventInput = {
            ...currentInput,
            ...(cleanBase as unknown as EventInput),
            id: newId,
            projectId: newId,
            eventName: projectName.trim(),
        };
        delete (newProjectInput as any).input;

        // 2. Sauvegarde Cloud Firestore avec payload garanti sans imbrication récursive
        if (currentUser?.uid) {
            try {
                const projectRef = doc(db, 'projects', newId);
                const firestoreDoc = buildFirestoreProjectDoc(newProjectInput, {
                    id: newId,
                    projectId: newId,
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    title: projectName.trim(),
                    eventName: projectName.trim(),
                    djName: currentInput.djName || '',
                    status: 'Enregistré',
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });

                const sanitizedDoc = await pruneHeavyPayloadForFirestore(firestoreDoc);
                const guardedDoc = guardFirestorePayloadSize(sanitizedDoc);

                await setDoc(projectRef, guardedDoc, { merge: true });
            } catch (err: any) {
                if (isFirestoreDocumentSizeError(err)) {
                    showToast(
                        "L'image intégrée est trop lourde pour être synchronisée en base, veuillez utiliser une image plus légère",
                        'warning',
                        6000
                    );
                } else {
                    console.warn('[ProjectManagerModal] Sauvegarde Firestore différée (secours local actif):', err);
                }
            }
        }

        const newProject: SavedProject = {
            id: newId,
            name: projectName.trim(),
            updatedAt: formattedDate,
            updatedAtMillis: nowMillis,
            status: 'Enregistré',
            input: newProjectInput,
        };

        const updated = [newProject, ...projects.filter((p) => p.name !== newProject.name && p.id !== newId)];
        setProjects(updated);

        // 3. Double ancrage local : LocalStorage (métadonnées/projets légers) + IndexedDB (persistance intégrale haute capacité)
        try {
            await saveProjectToIndexedDB(newProjectInput);
            await saveProjectToIndexedDB(newProject);
        } catch {}

        try {
            safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], newProjectInput);
            if (!hasBase64Images(newProjectInput)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
        } catch {}

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
    };

    // Supprimer un projet
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Supprimer définitivement ce projet de vos archives ?')) return;

        if (currentUser?.uid) {
            try {
                await deleteDoc(doc(db, 'projects', id));
            } catch (err) {
                console.error('[ProjectManagerModal] Erreur suppression Firestore:', err);
            }
        }

        try {
            await deleteProjectFromIndexedDB(id);
        } catch {}

        const updated = projects.filter((p) => p.id !== id);
        setProjects(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
    };

    // Exporter en JSON
    const handleExportJSON = () => {
        const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `droppaid-backup-projets-${Date.now()}.json`;
        a.click();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header Modal */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                            <FolderOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white font-['Syne']">
                                Mes Projets &amp; Affiches Enregistrées
                            </h3>
                            <p className="text-[11px] font-mono text-zinc-400">
                                Compte {currentUser?.email || getConfiguredAdminEmail()} • Synchronisation Cloud temps réel
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Enregistrement rapide */}
                <div className="py-4 border-b border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-lime-400 font-bold block">
                        Enregistrer la composition actuelle
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const blank = createBlankEventInput();
                                onLoadProject(blank);
                                try {
                                    safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], blank);
                                } catch {}
                                onClose();
                                showToast('Studio vierge initialisé : page blanche totale.', 'info');
                            }}
                            className="text-[11px] font-mono text-zinc-400 hover:text-lime-400 flex items-center gap-1 transition cursor-pointer py-1 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-lime-400/40"
                            title="Réinitialiser avec un studio 100% vierge"
                        >
                            <Plus className="w-3.5 h-3.5 text-lime-400" />
                            <span>Nouveau projet vierge</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onLoadProject(SE_FAIRE_ENTENDRE_PROJECT);
                                try {
                                    safeSaveProjectToLocalStorage(['signaid_studio_current_project', 'droppaid_last_event_input'], SE_FAIRE_ENTENDRE_PROJECT);
                                } catch {}
                                onClose();
                                showToast('Modèle "Se faire entendre" chargé avec succès.', 'success');
                            }}
                            className="text-[11px] font-mono text-amber-300 hover:text-white flex items-center gap-1 transition cursor-pointer py-1 px-2.5 rounded-lg bg-zinc-900 border border-amber-600/40 hover:border-amber-400/80"
                            title="Charger le modèle officiel 'Se faire entendre'"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Modèle "Se faire entendre"</span>
                        </button>
                    </div>
                </div>
                <span className="hidden">
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Nom du projet (ex: LIVE SET - NAMUR)"
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:border-lime-400 transition"
                        />
                        <button
                            type="button"
                            onClick={handleSaveCurrent}
                            className="py-2 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 transition shadow-md"
                        >
                            {savedSuccess ? <Check className="w-4 h-4 text-black" /> : <Save className="w-4 h-4" />}
                            <span>{savedSuccess ? 'Enregistré !' : 'Sauvegarder'}</span>
                        </button>
                    </div>
                </div>

                {/* Liste des projets */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                        <span>Projets disponibles ({projects.length})</span>
                        {projects.length > 0 && (
                            <button
                                type="button"
                                onClick={handleExportJSON}
                                className="hover:text-lime-400 flex items-center gap-1 transition"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Exporter JSON</span>
                            </button>
                        )}
                    </div>

                    {projects.length === 0 ? (
                        <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-center space-y-1">
                            <Clock className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                            <p className="text-xs text-zinc-400 font-bold">Aucun projet enregistré pour le moment.</p>
                            <p className="text-[10px] text-zinc-600 font-mono">
                                Modifiez votre affiche dans le Studio ou donnez un nom ci-dessus.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {projects.map((proj) => (
                                <div
                                    key={proj.id}
                                    data-testid="project-card"
                                    onClick={() => {
                                        onLoadProject(proj.input);
                                        onClose();
                                    }}
                                    className="p-3 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-lime-400/50 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition group shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                                                {proj.input.backgroundImage ? (
                                                    <img src={proj.input.backgroundImage} alt="Fond" width={44} height={44} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                ) : proj.input.djPhoto ? (
                                                    <img src={proj.input.djPhoto} alt="DJ" width={44} height={44} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 text-zinc-600" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="text-xs font-bold text-white truncate group-hover:text-lime-400 transition">
                                                        {proj.name}
                                                    </h4>
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-lime-400/10 text-lime-400 border border-lime-400/20 shrink-0">
                                                        {proj.status || 'Actif'}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-mono text-zinc-500 block truncate">
                                                    {proj.input.djName ? `Artiste : ${proj.input.djName}` : 'Sans artiste'} • {proj.input.genre || 'Futur'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(proj.id, e)}
                                            className="p-1 text-zinc-600 hover:text-zinc-300 transition shrink-0"
                                            title="Supprimer ce projet"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-zinc-500" />
                                            <span>{formatProjectDate(proj.updatedAt)}</span>
                                        </div>
                                        <span className="text-lime-400 font-bold group-hover:underline">Charger ➔</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Synchronisation Firestore {currentUser ? 'Connectée' : 'Locale'}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-1 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                    >
                        Fermer
                    </button>
                </div>

            </div>
        </div>
    );
};