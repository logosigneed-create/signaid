import {
    Shirt,
    Palette,
    Wand2,
    Share2,
    ShoppingBag,
    Trophy
} from "lucide-react";
import { FeatureData } from "./landingTypes";

export const PLATFORM_FEATURES: FeatureData[] = [
    {
        id: "01",
        title: "CHOIX DU PRODUIT",
        subtitle: "Base Premium",
        description: "Sélectionnez votre support parmi une gamme de vêtements streetwear haute qualité (Hoodies, T-shirts Heavyweight) prêts à être transformés.",
        icon: Shirt,
        details: ["Coton Bio", "Coupes Oversize", "Qualité Heavyweight"]
    },
    {
        id: "02",
        title: "PERSONNALISATION",
        subtitle: "Studio Créatif",
        description: "Utilisez l'atelier pour ajouter vos textes, importer vos images ou utiliser des codes exclusifs pour débloquer des designs uniques.",
        icon: Palette,
        details: ["Outils de texte", "Import PNG/JPG", "Détourage Auto"]
    },
    {
        id: "03",
        title: "SIMULATION",
        subtitle: "Moteur IA Gemini",
        description: "Ne l'imaginez pas, voyez-le. Notre IA génère un essayage virtuel ultra-réaliste de votre création sur vous-même avant toute production.",
        icon: Wand2,
        details: ["Rendu Photo-réaliste", "Essayage Virtuel", "Éclairage Studio"]
    },
    {
        id: "04",
        title: "PARTAGE",
        subtitle: "Feed Communautaire",
        description: "Publiez vos créations sur le feed. Inspirez la communauté et laissez les autres utilisateurs 'Remixer' votre style.",
        icon: Share2,
        details: ["Profil Créateur", "Système de Remix", "Likes & Abonnements"]
    },
    {
        id: "05",
        title: "VENTE",
        subtitle: "Marketplace & Impression",
        description: "Transformez le virtuel en réel. Commandez votre pièce unique ou mettez-la en vente pour la communauté.",
        icon: ShoppingBag,
        details: ["Impression DTG", "Livraison Rapide", "Gestion des ventes"]
    },
    {
        id: "06",
        title: "RÉCOMPENSES",
        subtitle: "Gamification",
        description: "Rien que ça. Gagnez des crédits à chaque étape : création, partage, vote. Utilisez-les pour générer plus de simulations IA.",
        icon: Trophy,
        details: ["SignPong Game", "Crédits Gratuits", "Statut VIP"]
    }
];
