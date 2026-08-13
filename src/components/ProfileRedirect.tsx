import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import VitrineHome from "../app/page";

/**
 * ProfilPage — signaid.eu/profil
 *
 * Page vitrine PUBLIQUE et partageable.
 * - Avec ?uid=XXXX  → affiche la vitrine de cet utilisateur (accessible à tous)
 * - Sans uid + connecté → redirige vers /profil?uid=MON_UID (sa propre vitrine)
 * - Sans uid + non connecté → affiche la landing Signaid générique
 *
 * Cette URL peut être reliée à un nom de domaine custom (ex: monentreprise.com → signaid.eu/profil?uid=XXXX)
 */
export default function ProfilPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const uid = new URLSearchParams(location.search).get("uid");

  useEffect(() => {
    // Si l'ancienne URL avec l'UID de Fabrizio est consultée → redirection vers le slug propre /fabrizio
    if (uid === "guest_ms3ijgnco2xnid") {
      navigate("/fabrizio", { replace: true });
      return;
    }
    if (uid) return;

    // Pas d'uid → redirection vers /fabrizio si connecté ou vitrine par défaut
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/fabrizio", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [uid, navigate]);

  // Dans tous les cas on rend VitrineHome : il gère lui-même le ?uid et le fallback landing
  return <VitrineHome />;
}
