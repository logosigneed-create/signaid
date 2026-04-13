import React, { useState } from 'react';

interface LogoCreationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: LogoCreationData) => void;
    type?: 'creation' | 'redesign';
    initialData?: LogoCreationData;
}

import { LogoCreationData } from '../types';

export const LogoCreationForm: React.FC<LogoCreationFormProps> = ({ isOpen, onClose, onSubmit, type = 'creation', initialData }) => {
    const [formData, setFormData] = useState<LogoCreationData>(initialData || {
        activityName: '',
        description: '',
        referenceLogo: null,
        type: type,
    });



    // Update internal type if prop changes
    React.useEffect(() => {
        setFormData((prev: LogoCreationData) => ({ ...prev, type }));
    }, [type]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev: LogoCreationData) => ({ ...prev, referenceLogo: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.activityName) {
            alert('Veuillez entrer le nom de votre activité.');
            return;
        }
        onSubmit(formData);
    };

    const isRedesign = formData.type === 'redesign';

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Form Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-fade-in max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                            LOGO SERVICE
                        </h2>
                        <p className={`text-xs font-black uppercase tracking-widest animate-pulse text-indigo-500`}>
                            OFFRE TEAM & PRO
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SERVICE TYPE TOGGLE */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'creation' }))}
                                className={`flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${!isRedesign ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <i className="fa-solid fa-pen-nib"></i>
                                Option A : Création
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'redesign' }))}
                                className={`flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isRedesign ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                Option B : Refonte (Service Logo)
                            </button>
                        </div>

                        <div className={`p-4 rounded-xl text-xs font-medium border ${isRedesign ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                            <i className="fa-solid fa-gift mr-2 text-lg"></i>
                            <span className="font-bold">Offre Team & Pro :</span> Vous commandez pour une équipe ? La création graphique ou la refonte de votre logo est <span className="font-black underline">OFFERTE</span> dès 10 articles commandés !
                        </div>

                        {/* Activity Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Nom de l'activité</label>
                            <input
                                required
                                type="text"
                                placeholder="E.g. Restaurant, Club de sport, Association..."
                                className={`w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all font-bold text-gray-700 focus:ring-2 ${isRedesign ? 'focus:border-indigo-500 focus:ring-indigo-200' : 'focus:border-red-500 focus:ring-red-200'}`}
                                value={formData.activityName}
                                onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                            />
                        </div>



                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                            <textarea
                                rows={6}
                                placeholder="Détails de votre activité, produits & services, public cible (Qui sont vos clients ?), et modifications souhaitées..."
                                className={`w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all font-medium resize-none focus:ring-2 ${isRedesign ? 'focus:border-indigo-500 focus:ring-indigo-200' : 'focus:border-red-500 focus:ring-red-200'}`}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>





                        {/* Reference Logo Upload */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo de référence</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="reference-logo-upload"
                                />
                                <label
                                    htmlFor="reference-logo-upload"
                                    className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-300 transition-all ${formData.referenceLogo ? 'p-1' : 'p-4'}`}
                                >
                                    {formData.referenceLogo ? (
                                        <div className="relative w-full h-full group">
                                            <img src={formData.referenceLogo} className="w-full h-full object-contain rounded-lg" alt="Reference" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                                <span className="text-white text-[10px] font-bold">CHANGER</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cloud-arrow-up text-gray-300 text-2xl mb-2"></i>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                                                Cliquez pour ajouter un logo de référence
                                            </span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            type="submit"
                            className={`w-full py-5 text-white font-black rounded-xl shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-r ${isRedesign ? 'from-indigo-600 to-blue-600 shadow-indigo-200' : 'from-red-600 to-orange-600 shadow-red-200'}`}
                        >
                            ENREGISTRER LA DEMANDE
                        </button>

                        <p className="text-center text-[10px] text-gray-400 font-medium px-4">
                            En cliquant, vous confirmez votre demande. Le service est offert pour toute commande devis de plus de 10 articles.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};
