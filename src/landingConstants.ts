import {
    Shirt,
    Palette,
    Wand2,
    Share2,
    ShoppingBag,
    Trophy,
    Fingerprint
} from "lucide-react";
import { FeatureData } from "./landingTypes";

export const PLATFORM_FEATURES: FeatureData[] = [
    {
        id: "01",
        title: "SYSTÈME D'IMPRESSION",
        subtitle: "Conçu pour les Imprimeurs",
        description: "SIGNAID est un écosystème qui modernise la chaîne de valeur graphique en connectant le digital et le physique de manière fluide.",
        icon: Palette,
        details: ["Interface Imprimeur", "Flux Digitaux", "Valeur Ajoutée"]
    },
    {
        id: "02",
        title: "FLYERS INTERACTIFS",
        subtitle: "Support Augmenté",
        description: "Allez au-delà du papier. Intégrez des QR codes intelligents qui transforment vos flyers en véritables outils de conversion digitaux.",
        icon: Share2,
        details: ["Lien Calendrier", "Localisation GPS", "Suivi des Clics"]
    },
    {
        id: "03",
        title: "INTERACTIVITÉ VISUELLE",
        subtitle: "Design Dynamique",
        description: "Permettez à vos clients de visualiser leurs projets en 3D et d'interagir avec les designs avant même le lancement en production.",
        icon: Wand2,
        details: ["Aperçu Interactif", "Manipulation 3D", "Validation Client"]
    },
    {
        id: "04",
        title: "NETWORKING DIGITAL",
        subtitle: "Cartes Connectées",
        description: "La carte de visite réinventée. Une passerelle instantanée entre votre identité physique et vos réseaux professionnels digitaux.",
        icon: Fingerprint,
        details: ["V-Card Contact", "Réseaux Sociaux", "Effet Waouh"]
    },
    {
        id: "05",
        title: "TEXTILES SPÉCIALISÉS",
        subtitle: "Workwear & Merch",
        description: "Personnalisation haute fidélité sur textiles premium avec une approche digitale pour simplifier la commande et le rendu.",
        icon: Shirt,
        details: ["Impression DTF HD", "Sérigraphie Pro", "Coupes Premium"]
    },
    {
        id: "06",
        title: "LOGISTIQUE LOCALE",
        subtitle: "Rapidité & Expertise",
        description: "Une production experte couplée à une livraison express. Nous gérons la complexité pour vous livrer la simplicité.",
        icon: ShoppingBag,
        details: ["Délais Maîtrisés", "Packaging Soigné", "Support Dédié"]
    }
];
