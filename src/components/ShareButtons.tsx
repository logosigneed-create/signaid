import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

interface ShareButtonsProps {
    postId: string;
    productType?: string;
    imageUrl: string;
    magicLink: string; // Expected to be the full URL to /remix/:postId
    onClose?: () => void;
    className?: string;
    compact?: boolean;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
    postId,
    productType,
    imageUrl,
    magicLink,
    onClose,
    className = "",
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `signaid-${postId.substring(0, 6)}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsOpen(false);
            if (onClose) onClose();
        } catch (err) {
            console.error('Download failed', err);
            window.open(imageUrl, '_blank');
        }
    };

    const handleCopyLink = async () => {
        setIsLoading(true);
        try {
            // Generate deterministic short ID based on postId
            const shortId = postId.substring(0, 8).toUpperCase();
            const linkRef = doc(db, 'shortLinks', shortId);

            // Check if exists, if not create with metadata
            const snap = await getDoc(linkRef);
            if (!snap.exists()) {
                await setDoc(linkRef, {
                    postId: postId,
                    productType: productType || null,
                    createdAt: serverTimestamp(),
                    source: 'web_share'
                });
            }

            const url = `${window.location.origin}/s/${shortId}`;
            await navigator.clipboard.writeText(url);
            alert("Lien court copié !");
            setIsOpen(false);
            if (onClose) onClose();
        } catch (e) {
            console.error("Short link creation failed", e);
            // Fallback to long link
            try {
                await navigator.clipboard.writeText(magicLink);
                alert("Lien copié !");
            } catch (err) {
                alert("Impossible de copier le lien.");
            }
            setIsOpen(false);
            if (onClose) onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Regarde ce design sur SIGNAID ! ${magicLink}`)}`;

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg hover:bg-black/60 transition-all"
                title="Partager"
            >
                <i className="fa-solid fa-share-nodes text-lg"></i>
            </button>
            {isOpen && (
                <div
                    className="absolute bottom-12 right-0 bg-white rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-48 animate-fade-in text-gray-800 z-[100] border border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleCopyLink}
                        disabled={isLoading}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors text-left text-sm font-bold disabled:opacity-50"
                    >
                        <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-link'} text-blue-500`}></i>
                        {isLoading ? 'Génération...' : 'Copier le lien'}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors text-left text-sm font-bold"
                    >
                        <i className="fa-solid fa-download text-green-500"></i> Télécharger
                    </button>

                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg transition-colors text-left text-sm font-bold"
                        onClick={() => { setIsOpen(false); if (onClose) onClose(); }}
                    >
                        <i className="fa-brands fa-whatsapp text-green-500 text-lg"></i> WhatsApp
                    </a>
                </div>
            )}
        </div>
    );
};
