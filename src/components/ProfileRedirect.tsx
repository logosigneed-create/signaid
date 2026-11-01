import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import VitrineHome from "../app/page";
import ArtistProfileView from "./ArtistProfileView";

/**
 * ProfilPage — signaid.eu/profil
 *
 * Page vitrine PUBLIQUE et partageable pour n'importe quel profil ou prospect.
 * - Avec ?slug=XXXX ou ?uid=XXXX ou ?id=XXXX ou ?audit=XXXX → affiche la vitrine de ce profil (ArtistProfileView)
 * - Sans identifiant + utilisateur connecté non anonyme → redirige vers son profil
 * - Sans identifiant + non connecté / anonyme → affiche la vitrine d'accueil / landing Signaid
 */
export default function ProfilPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const identifier = searchParams.get("slug") || searchParams.get("uid") || searchParams.get("id") || searchParams.get("audit");

  useEffect(() => {
    // Si l'utilisateur demande explicitement le profil par défaut de Fabrizio / DJ D-FAZZ
    if (identifier === "guest_ms3ijgnco2xnid" || identifier === "audit-8f198p5" || identifier === "fabrizio" || identifier === "djdfazz") {
      navigate("/guest_ms3ijgnco2xnid", { replace: true });
      return;
    }

    // Pas d'identifiant dans l'URL → redirection uniquement si un vrai utilisateur (non anonyme) est connecté
    if (!identifier) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous) {
          navigate(`/profil?uid=${user.uid}`, { replace: true });
        }
      });
      return () => unsubscribe();
    }
  }, [identifier, navigate]);

  // Si un identifiant de prospect / artiste est spécifié (?slug=..., ?uid=..., etc.)
  if (identifier && identifier !== "guest_ms3ijgnco2xnid" && identifier !== "audit-8f198p5" && identifier !== "fabrizio" && identifier !== "djdfazz") {
    return <ArtistProfileView />;
  }

  // Dans tous les autres cas (landing / fallback sans identifiant), on rend VitrineHome
  return <VitrineHome />;
}
