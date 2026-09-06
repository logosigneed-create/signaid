import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';

export interface FlyerHotspot {
    id: string;
    url: string;
    label?: string; // CTA / description text
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface FlyerPage {
    image: string;
    hotspots: FlyerHotspot[];
}

export interface FlyerConfig {
    id?: string;
    title?: string;
    description?: string;
    aspectRatio?: 'portrait' | 'landscape';
    theme: any;
    globalLink: string;
    pages: {
        recto: FlyerPage;
        verso?: FlyerPage;
    };
}

export const DEFAULT_IN_THE_DARK_FLYER_CONFIG: FlyerConfig = {
    id: "inthedark",
    title: "In The Dark — Flyer Interactif",
    description: "Flyer interactif de l'événement In The Dark (L'Aquarelle Liège) : programmation, artistes, itinéraire GPS et réservation.",
    aspectRatio: "portrait",
    theme: {
        zoneColor: "rgba(255, 79, 129, 0.25)",
        zoneBorderColor: "rgba(255, 79, 129, 0.8)",
        zoneHoverColor: "rgba(255, 79, 129, 0.4)",
        zoneLabelColor: "#ffffff",
        zoneLabelBg: "rgba(255, 79, 129, 0.85)",
        backgroundColor: "#0f0f1a"
    },
    globalLink: "https://signaid.eu/inthedark",
    pages: {
        recto: {
            image: "recto.png",
            hotspots: [
                {
                    id: "1",
                    label: "In the dark — Ajouter au calendrier",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=In%20the%20dark&dates=20250418T200000Z/20250418T210000Z",
                    x: 16.67,
                    y: 86.43,
                    w: 66.05,
                    h: 9.96
                }
            ]
        },
        verso: {
            image: "verso.png",
            hotspots: [
                {
                    id: "3",
                    label: "L'aquarelle - Liège (Itinéraire Maps)",
                    url: "https://www.google.com/maps/place/L'aquarelle+-+Li%C3%A8ge/@50.6412499,5.5688972,3a,75y,86.93h,90t/data=!3m7!1e1!3m5!1sh9aRG0XuOWtJzSyeyKmeFA!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3Dh9aRG0XuOWtJzSyeyKmeFA%26yaw%3D86.93!7i16384!8i8192!4m16!1m8!3m7!1s0x47c0fba1fa81d24d:0xba76abaeb0cca32a!2sL'aquarelle+-+Li%C3%A8ge!8m2!3d50.6412595!4d5.5691071!10e5!16s%2Fg%2F11tgdlg2_1!3m6!1s0x47c0fba1fa81d24d:0xba76abaeb0cca32a!8m2!3d50.6412595!4d5.5691071!10e5!16s%2Fg%2F11tgdlg2_1?entry=ttu&g_ep=EgoyMDI2MDIxNi4wIKXMDSoASAFQAw%3D%3D",
                    x: 12.05,
                    y: 3.09,
                    w: 76.44,
                    h: 10.29
                },
                {
                    id: "4",
                    label: "Mégane Brescich (@meganebrescich_techno)",
                    url: "https://www.instagram.com/meganebrescich_techno/",
                    x: 4.43,
                    y: 33.66,
                    w: 87.99,
                    h: 11.11
                },
                {
                    id: "5",
                    label: "Vadou DJ (Instagram)",
                    url: "https://www.instagram.com/vadou_dj",
                    x: 8.59,
                    y: 47.51,
                    w: 20.55,
                    h: 6.04
                },
                {
                    id: "6",
                    label: "Whysee 777 (Instagram)",
                    url: "https://www.instagram.com/whysee_777",
                    x: 33.07,
                    y: 48.13,
                    w: 21.94,
                    h: 4.41
                },
                {
                    id: "7",
                    label: "Passshok (Instagram)",
                    url: "https://www.instagram.com/passshok1",
                    x: 59.16,
                    y: 48.26,
                    w: 27.71,
                    h: 4.57
                },
                {
                    id: "8",
                    label: "Meven 909 (Instagram)",
                    url: "https://www.instagram.com/meven_909/",
                    x: 38.84,
                    y: 59.34,
                    w: 19.4,
                    h: 4.25
                }
            ]
        }
    }
};

export const DEFAULT_BAR80_FLYER_CONFIG: FlyerConfig = {
    id: "raveoldschool",
    title: "Rave Old School — Bar 80 Liège",
    description: "Flyer interactif de l'événement Rave Old School au Bar 80 Liège avec MIKE B et L'Après-Midize.",
    aspectRatio: "landscape",
    theme: {
        zoneColor: "rgba(220, 38, 38, 0.25)",
        zoneBorderColor: "rgba(239, 68, 68, 0.9)",
        zoneHoverColor: "rgba(239, 68, 68, 0.45)",
        zoneLabelColor: "#ffffff",
        zoneLabelBg: "rgba(220, 38, 38, 0.9)",
        backgroundColor: "#0d0408"
    },
    globalLink: "https://signaid.eu/raveoldschool",
    pages: {
        recto: {
            image: "bar80.jpg",
            hotspots: [
                {
                    id: "fb_bar80",
                    label: "Bar 80 Liège (Page Facebook)",
                    url: "https://www.facebook.com/BAR80LIEGE",
                    x: 43.5,
                    y: 2.2,
                    w: 13.0,
                    h: 18.5
                },
                {
                    id: "cal_7aout",
                    label: "7 Août (23h - 06h) — Ajouter au calendrier Google",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=Rave%20Old%20School%20%E2%80%94%20Bar%2080&dates=20260807T210000Z/20260808T040000Z&location=Rue%20des%20Dominicains%204E%2C%204000%20Li%C3%A8ge&details=Rave%20Old%20School%20au%20Bar%2080%20Li%C3%A8ge%20avec%20MIKE%20B%20%26%20L%27APR%C3%88S-MIDIZE%20(Entr%C3%A9e%20offerte)%20%7C%20https%3A%2F%2Fsignaid.eu%2Fraveoldschool",
                    x: 3.7,
                    y: 49.5,
                    w: 19.5,
                    h: 19.0
                },
                {
                    id: "maps_bar80",
                    label: "Rue des Dominicains 4E, Liège (Itinéraire Google Maps)",
                    url: "https://www.google.com/maps/search/?api=1&query=Rue+des+Dominicains+4E%2C+4000+Li%C3%A8ge%2C+Belgique",
                    x: 71.5,
                    y: 49.5,
                    w: 25.2,
                    h: 19.0
                },
                {
                    id: "dj_mikeb",
                    label: "DJ MIKE B (@djmikebofficial)",
                    url: "https://www.instagram.com/djmikebofficial/",
                    x: 34.0,
                    y: 70.0,
                    w: 15.5,
                    h: 20.0
                },
                {
                    id: "dj_apres_midize",
                    label: "L'après-Midize (Page Facebook)",
                    url: "https://www.facebook.com/profile.php?id=100089217100770",
                    x: 50.5,
                    y: 70.0,
                    w: 27.0,
                    h: 20.0
                }
            ]
        }
    }
};

export const DEFAULT_13ANSVR_FLYER_CONFIG: FlyerConfig = {
    id: "13ansvr",
    title: "13 Ans de Vision Room — SPARKOH! Salle des Trémies",
    description: "Flyer interactif de l'événement 13 Ans de Vision Room au SPARKOH! Salle des Trémies le 7 Novembre (22:00 - 06:00).",
    aspectRatio: "landscape",
    theme: {
        zoneColor: "rgba(59, 130, 246, 0.25)",
        zoneBorderColor: "rgba(96, 165, 250, 0.9)",
        zoneHoverColor: "rgba(59, 130, 246, 0.45)",
        zoneLabelColor: "#ffffff",
        zoneLabelBg: "rgba(30, 58, 138, 0.9)",
        backgroundColor: "#070b14"
    },
    globalLink: "https://signaid.eu/13ansvr",
    pages: {
        recto: {
            image: "13ansvr.jpg",
            hotspots: [
                {
                    id: "logo_vision",
                    label: "Club Vision Room (Boutique & Vitrine Officielle)",
                    url: "https://signaid.eu/clubvisionroom",
                    x: 42.0,
                    y: 2.5,
                    w: 16.0,
                    h: 22.5
                },
                {
                    id: "cal_7nov",
                    label: "7 Novembre (22h - 06h) — Ajouter au calendrier Google",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=13%20Ans%20de%20Vision%20Room%20%E2%80%94%20SPARKOH%21&dates=20261107T210000Z/20261108T050000Z&location=SPARKOH%21%20-%20Salle%20des%20Tr%C3%A9mies%2C%20Rue%20de%20Mons%203%2C%207080%20Frameries&details=13%20Ans%20de%20Vision%20Room%20au%20SPARKOH%21%20Salle%20des%20Tr%C3%A9mies%20(22h%20-%2006h)%20%7C%20https%3A%2F%2Fsignaid.eu%2F13ansvr",
                    x: 24.5,
                    y: 37.5,
                    w: 51.0,
                    h: 24.5
                },
                {
                    id: "maps_sparkoh",
                    label: "SPARKOH! — Salle des Trémies (Itinéraire Google Maps)",
                    url: "https://www.google.com/maps/search/?api=1&query=SPARKOH%21+Rue+de+Mons+3+7080+Frameries+Belgique",
                    x: 22.5,
                    y: 62.5,
                    w: 55.0,
                    h: 19.0
                },
                {
                    id: "tickets_vision",
                    label: "Billetterie & Infos (Club Vision)",
                    url: "https://abrief.clubvision.com",
                    x: 23.5,
                    y: 85.5,
                    w: 53.0,
                    h: 13.0
                }
            ]
        }
    }
};

export const DEFAULT_COURRIERE_FLYER_CONFIG: FlyerConfig = {
    id: "courriere11-14",
    title: "Kermesse de Courrière — 11 au 14 Septembre | Programme & Flyer Interactif",
    description: "Flyer interactif de la Kermesse de Courrière sous chapiteau (11, 12, 13 et 14 Septembre) organisé par la Jeunesse de Courrière et la Fanfare Royale Cécilia.",
    aspectRatio: "portrait",
    theme: {
        zoneColor: "rgba(245, 158, 11, 0.25)",
        zoneBorderColor: "rgba(251, 191, 36, 0.9)",
        zoneHoverColor: "rgba(245, 158, 11, 0.45)",
        zoneLabelColor: "#ffffff",
        zoneLabelBg: "rgba(180, 83, 9, 0.9)",
        backgroundColor: "#0b0806"
    },
    globalLink: "https://signaid.eu/courriere11-14",
    pages: {
        recto: {
            image: "courriere.jpg",
            hotspots: [
                {
                    id: "maps_courriere",
                    label: "Courrière — Salle Cécilia / Sous chapiteau (Itinéraire Google Maps)",
                    url: "https://www.google.com/maps/search/?api=1&query=Salle+C%C3%A9cilia+Courri%C3%A8re+Belgique",
                    x: 10.0,
                    y: 3.0,
                    w: 80.0,
                    h: 11.5
                },
                {
                    id: "header_dates",
                    label: "Kermesse de Courrière (11 au 14 Sept) — Ajouter au calendrier",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=Kermesse%20de%20Courri%C3%A8re%20sous%20chapiteau&dates=20260911T160000Z/20260914T220000Z&location=Parking%20Salle%20C%C3%A9cilia%2C%205336%20Courri%C3%A8re%2C%20Belgique&details=Kermesse%20de%20Courri%C3%A8re%20sous%20chapiteau%20du%2011%20au%2014%20Septembre%20%7C%20https%3A%2F%2Fsignaid.eu%2Fcourriere11-14",
                    x: 5.0,
                    y: 15.0,
                    w: 90.0,
                    h: 36.0
                },
                {
                    id: "ve11",
                    label: "Vendredi 11 Sept : Apéros, Boum des enfants, Soirée (Calendrier)",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=VE%2011%20Septembre%20%E2%80%94%20Kermesse%20de%20Courri%C3%A8re&dates=20260911T160000Z/20260912T030000Z&location=Courri%C3%A8re%2C%205336%20Assesse%2C%20Belgique&details=Ap%C3%A9ros%20Courri%C3%A8rois%2C%20Boum%20des%20enfants%2C%20Soir%C3%A9e%20%7C%20https%3A%2F%2Fsignaid.eu%2Fcourriere11-14",
                    x: 4.0,
                    y: 62.0,
                    w: 23.0,
                    h: 18.0
                },
                {
                    id: "sa12",
                    label: "Samedi 12 Sept : Jogging, Tournoi Baby-foot, Blindtest (Calendrier)",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=SA%2012%20Septembre%20%E2%80%94%20Kermesse%20de%20Courri%C3%A8re&dates=20260912T120000Z/20260913T030000Z&location=Courri%C3%A8re%2C%205336%20Assesse%2C%20Belgique&details=Jogging%2C%20Tournoi%20de%20baby-foot%2C%20Blindtest%20%7C%20https%3A%2F%2Fsignaid.eu%2Fcourriere11-14",
                    x: 28.0,
                    y: 62.0,
                    w: 23.0,
                    h: 18.0
                },
                {
                    id: "di13",
                    label: "Dimanche 13 Sept : Apéro fanfare, Repas de la kermesse (Calendrier)",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=DI%2013%20Septembre%20%E2%80%94%20Kermesse%20de%20Courri%C3%A8re&dates=20260913T100000Z/20260913T220000Z&location=Courri%C3%A8re%2C%205336%20Assesse%2C%20Belgique&details=Ap%C3%A9ro%20en%20fanfare%2C%20Repas%20de%20la%20kermesse%20%7C%20https%3A%2F%2Fsignaid.eu%2Fcourriere11-14",
                    x: 52.0,
                    y: 62.0,
                    w: 22.0,
                    h: 18.0
                },
                {
                    id: "lu14",
                    label: "Lundi 14 Sept : Accueil 60+, Apéro des sponsors (Calendrier)",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=LU%2014%20Septembre%20%E2%80%94%20Kermesse%20de%20Courri%C3%A8re&dates=20260914T140000Z/20260914T230000Z&location=Courri%C3%A8re%2C%205336%20Assesse%2C%20Belgique&details=Accueil%20des%2060%2B%2C%20Ap%C3%A9ro%20des%20sponsors%20%7C%20https%3A%2F%2Fsignaid.eu%2Fcourriere11-14",
                    x: 75.0,
                    y: 62.0,
                    w: 22.0,
                    h: 18.0
                },
                {
                    id: "fb_cecilia",
                    label: "Fanfare Royale Cécilia Courrière (Facebook)",
                    url: "https://www.facebook.com/search/top?q=fanfare%20royale%20cecilia%20courriere",
                    x: 13.0,
                    y: 91.0,
                    w: 35.0,
                    h: 4.5
                },
                {
                    id: "fb_jeunesse",
                    label: "Jeunesse de Courrière (Facebook)",
                    url: "https://www.facebook.com/jeunessedecourriere",
                    x: 50.0,
                    y: 91.0,
                    w: 38.0,
                    h: 4.5
                },
                {
                    id: "ig_jeunesse",
                    label: "@jeunessedecourriere (Instagram)",
                    url: "https://www.instagram.com/jeunessedecourriere/",
                    x: 23.0,
                    y: 95.8,
                    w: 54.0,
                    h: 4.0
                }
            ]
        }
    }
};

export const DEFAULT_ELECTRONICWOOD_FLYER_CONFIG: FlyerConfig = {
    id: "electronicwood",
    title: "Electronic Wood — We Love Retro House (14 Hours Rave) | Flyer Interactif",
    description: "Flyer interactif de l'événement Electronic Wood au Bodies in Space (Bruxelles) le Samedi 26 Septembre 2026 avec Mentalist, Youri Parker, Frank Zolex, Marko De La Rocca...",
    aspectRatio: "portrait",
    theme: {
        zoneColor: "rgba(132, 204, 22, 0.25)",
        zoneBorderColor: "rgba(163, 230, 53, 0.9)",
        zoneHoverColor: "rgba(132, 204, 22, 0.45)",
        zoneLabelColor: "#ffffff",
        zoneLabelBg: "rgba(20, 83, 45, 0.9)",
        backgroundColor: "#050b05"
    },
    globalLink: "https://signaid.eu/electronicwood",
    pages: {
        recto: {
            image: "electronicwood.jpg",
            hotspots: [
                {
                    id: "ew_date",
                    label: "Samedi 26 Septembre (15h - 05h) — Ajouter au calendrier Google",
                    url: "https://www.google.com/calendar/render?action=TEMPLATE&text=Electronic%20Wood%20%E2%80%94%2014%20Hours%20Rave%20(We%20Love%20Retro%20House)&dates=20260926T130000Z/20260927T030000Z&location=Bodies%20in%20Space%20(BiS)%2C%20Chauss%C3%A9e%20de%20Zellik%2065%2C%201082%20Berchem-Sainte-Agathe&details=Electronic%20Wood%2014%20Hours%20Rave%20(15h00%20-%2005h00)%20%7C%20https%3A%2F%2Fsignaid.eu%2Felectronicwood",
                    x: 3.0,
                    y: 4.5,
                    w: 94.0,
                    h: 7.5
                },
                {
                    id: "ew_logo",
                    label: "We Love Retro House (Billetterie Officielle)",
                    url: "https://tickets.weloveretrohouse.com/",
                    x: 10.0,
                    y: 13.0,
                    w: 80.0,
                    h: 23.0
                },
                {
                    id: "ew_mentalist",
                    label: "DJ Mentalist (Vitrine & Boutique Officielle Signaid)",
                    url: "https://signaid.eu/mentalist",
                    x: 18.0,
                    y: 37.0,
                    w: 64.0,
                    h: 40.0
                },
                {
                    id: "ew_lineup",
                    label: "Line-up 14 Artistes : Youri Parker, Marko De La Rocca, Frank Zolex, Mentalist...",
                    url: "https://tickets.weloveretrohouse.com/",
                    x: 5.0,
                    y: 78.0,
                    w: 90.0,
                    h: 12.0
                },
                {
                    id: "ew_web",
                    label: "tickets.weloveretrohouse.com (Billetterie Officielle)",
                    url: "https://tickets.weloveretrohouse.com/",
                    x: 15.0,
                    y: 92.5,
                    w: 70.0,
                    h: 2.5
                },
                {
                    id: "ew_location",
                    label: "Bodies in Space (BiS) — Chaussée de Zellik 65, 1082 Bruxelles (Google Maps)",
                    url: "https://www.google.com/maps/search/?api=1&query=Bodies+in+Space+Chauss%C3%A9e+de+Zellik+65+1082+Berchem-Sainte-Agathe+Bruxelles",
                    x: 3.0,
                    y: 95.0,
                    w: 94.0,
                    h: 4.0
                }
            ]
        }
    }
};

const FLYER_CONFIG_DOC = doc(db, 'settings', 'flyer');

export const flyerService = {
    async getFlyerConfig(slug?: string): Promise<FlyerConfig> {
        const cleanSlug = (slug || '').toLowerCase().trim();
        const isElectronicWood = cleanSlug.includes('electronic') || cleanSlug.includes('wood') || cleanSlug.includes('electronicwood');
        const isCourriere = cleanSlug.includes('courriere') || cleanSlug.includes('courriere11-14');
        const isRave = cleanSlug.includes('rave');
        const is13Ans = cleanSlug.includes('13ans') || cleanSlug.includes('13ansvr');

        try {
            let docRef = FLYER_CONFIG_DOC;
            if (isElectronicWood) docRef = doc(db, 'settings', 'flyer_electronicwood');
            else if (isCourriere) docRef = doc(db, 'settings', 'flyer_courriere11_14');
            else if (is13Ans) docRef = doc(db, 'settings', 'flyer_13ansvr');
            else if (isRave) docRef = doc(db, 'settings', 'flyer_raveoldschool');

            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as FlyerConfig;
                if (data && data.pages && (data.pages.recto || data.pages.verso)) {
                    return data;
                }
            }
            if (isElectronicWood) return DEFAULT_ELECTRONICWOOD_FLYER_CONFIG;
            if (isCourriere) return DEFAULT_COURRIERE_FLYER_CONFIG;
            if (is13Ans) return DEFAULT_13ANSVR_FLYER_CONFIG;
            if (isRave) return DEFAULT_BAR80_FLYER_CONFIG;
            return DEFAULT_IN_THE_DARK_FLYER_CONFIG;
        } catch (error) {
            console.warn('Error fetching flyer config, fallback to default:', error);
            if (isElectronicWood) return DEFAULT_ELECTRONICWOOD_FLYER_CONFIG;
            if (isCourriere) return DEFAULT_COURRIERE_FLYER_CONFIG;
            if (is13Ans) return DEFAULT_13ANSVR_FLYER_CONFIG;
            if (isRave) return DEFAULT_BAR80_FLYER_CONFIG;
            return DEFAULT_IN_THE_DARK_FLYER_CONFIG;
        }
    },

    async saveFlyerConfig(config: FlyerConfig, slug?: string): Promise<void> {
        try {
            const cleanSlug = (slug || config.id || '').toLowerCase().trim();
            const isElectronicWood = cleanSlug.includes('electronic') || cleanSlug.includes('wood') || cleanSlug.includes('electronicwood');
            const isCourriere = cleanSlug.includes('courriere');
            const isRave = cleanSlug.includes('rave');
            const is13Ans = cleanSlug.includes('13ans') || cleanSlug.includes('13ansvr');

            let docRef = FLYER_CONFIG_DOC;
            if (isElectronicWood) docRef = doc(db, 'settings', 'flyer_electronicwood');
            else if (isCourriere) docRef = doc(db, 'settings', 'flyer_courriere11_14');
            else if (is13Ans) docRef = doc(db, 'settings', 'flyer_13ansvr');
            else if (isRave) docRef = doc(db, 'settings', 'flyer_raveoldschool');

            await setDoc(docRef, sanitizeForFirestore(config));
        } catch (error) {
            console.error('Error saving flyer config:', error);
            throw error;
        }
    }
};
