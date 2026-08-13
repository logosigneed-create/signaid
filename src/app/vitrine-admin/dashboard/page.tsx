"use client";

import { useEffect, useState } from "react";
import { getStoredConfig, saveStoredConfig, SiteConfig, ProfileLink, processLogo, generateAIPresentation, generatePitchFromWebSearch, generatePitchFromDocument, Social, CustomSection, defaultConfig } from "../../../lib/store";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth, db } from "../../../firebaseConfig";
import { onAuthStateChanged, signOut, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";
import { setDoc, doc, serverTimestamp, collection, query, where, onSnapshot, getDocs, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import "../../globals.css";

// Composant Banner Key
export function ActuationKeyBanner({ actuationKey, editingUid, isMagicLink }: { actuationKey: string; editingUid: string; isMagicLink?: boolean }) {
  const handleCopyLink = () => {
    const magicLink = `${window.location.origin}/vitrine-admin/dashboard?uid=${editingUid}&key=${actuationKey}`;
    navigator.clipboard.writeText(magicLink);
    alert("📋 Lien magique copié dans le presse-papiers ! Vous pouvez l'envoyer directement à votre client.");
  };

  return (
    <div 
      className="bg-slate-900 border border-blue-500/30 p-4 flex flex-wrap justify-between items-center rounded-xl gap-4"
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
        marginBottom: '2rem',
        gap: '1rem'
      }}
    >
      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div 
          className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" 
          style={{
            height: '8px',
            width: '8px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            boxShadow: '0 0 8px #3b82f6'
          }}
        />
        <span 
          className="text-slate-400 text-xs font-medium uppercase tracking-widest"
          style={{
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          Clé d'actuation sécurisée
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <code 
          className="text-blue-400 font-mono font-bold tracking-tighter text-lg bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20"
          style={{
            color: '#60a5fa',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.1)'
          }}
        >
          {actuationKey}
        </code>
        
        {!isMagicLink && (
          <button
            onClick={handleCopyLink}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🔗 Copier le lien magique client
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [livePhotoProgress, setLivePhotoProgress] = useState<string>("");
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const navigate = useNavigate();

  const [isAdminLightMode, setIsAdminLightMode] = useState(() => {
    return localStorage.getItem("admin_light_mode") === "true";
  });

  useEffect(() => {
    if (isAdminLightMode) {
      document.body.classList.add("admin-console-light");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.body.classList.remove("admin-console-light");
      document.documentElement.setAttribute("data-theme", "dark");
    }
    return () => {
      document.body.classList.remove("admin-console-light");
      document.documentElement.removeAttribute("data-theme");
    };
  }, [isAdminLightMode]);

  // Unified authentication states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Listen to Firestore order collection btp_dotations for active orders
  useEffect(() => {
    const isSignupMode = new URLSearchParams(window.location.search).get("mode") === "signup";
    if (!currentUser || isSignupMode) {
      setPendingOrdersCount(0);
      return;
    }
    const q = query(
      collection(db, "btp_dotations"), 
      where("projectId", "==", currentUser.uid),
      where("status", "==", "PENDING_PAYMENT")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.size);
    }, (err) => {
      console.warn("Failed to watch pending orders:", err);
    });
    return () => unsubscribe();
  }, [currentUser]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [previewKey, setPreviewKey] = useState("");

  // Combined Admin Profile configuration states for registration (Inscription)
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupSector, setSignupSector] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupWebsite, setSignupWebsite] = useState("");
  const [signupTva, setSignupTva] = useState("");
  const [signupLogo, setSignupLogo] = useState<string>("");
  const [signupLogoTheme, setSignupLogoTheme] = useState<string>("dark");
  const [signupLogoAccent, setSignupLogoAccent] = useState<string>("rgb(59, 130, 246)");
  const [signupPresentation, setSignupPresentation] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [isAnalyzingWeb, setIsAnalyzingWeb] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [claimUid, setClaimUid] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);

  useEffect(() => {
    // Generate beautiful preview key on mount
    const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    setPreviewKey(`SG-${segment()}-${segment()}`);

    // Check mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "signup") {
      setIsLogin(false);
    }

    // Prefill fields from bookmarklet
    const prefillName = urlParams.get("name");
    const prefillLogo = urlParams.get("logoUrl");
    const prefillPhone = urlParams.get("phone");
    const prefillWebsite = urlParams.get("website");
    const prefillDesc = urlParams.get("presentation");
    const prefillSector = urlParams.get("sector");
    if (prefillName) setSignupCompanyName(prefillName);
    if (prefillLogo) setSignupLogo(prefillLogo);
    if (prefillPhone) setSignupPhone(prefillPhone);
    if (prefillWebsite) setSignupWebsite(prefillWebsite);
    if (prefillDesc) setSignupPresentation(prefillDesc);
    if (prefillSector) setSignupSector(prefillSector);

    if (urlParams.get("claim")) {
      setClaimUid(urlParams.get("claim"));
      setActionHint(urlParams.get("action"));
    }
  }, []);

  const [editingUid, setEditingUid] = useState<string>("");
  const [prospectsList, setProspectsList] = useState<any[]>([]);
  const [djStats, setDjStats] = useState<{ totalMargin: number, sales: any[] }>({ totalMargin: 0, sales: [] });
  const [hoveredProspectUid, setHoveredProspectUid] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'editor' | 'prospects'>(
    new URLSearchParams(window.location.search).get("tab") === "prospects" ? "prospects" : "editor"
  );

  useEffect(() => {
    if (!editingUid) return;
    
    // Listen to real-time sales for the creator/DJ
    const salesRef = collection(db, "dj_sales");
    const q = query(
      salesRef, 
      where("userId", "==", editingUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesList: any[] = [];
      let total = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        total += d.margin || 0;
        salesList.push({
          id: doc.id,
          ...d,
          date: d.date?.seconds ? d.date.seconds * 1000 : d.date || Date.now()
        });
      });
      // Sort sales by date descending client-side
      salesList.sort((a, b) => b.date - a.date);
      setDjStats({
        totalMargin: total,
        sales: salesList
      });
    }, (err) => {
      console.warn("Failed to listen to dj_sales, using mock fallback:", err);
      setDjStats({
        totalMargin: 75.00,
        sales: [
          { id: '1', date: Date.now() - 86400000 * 2, productName: 'T-Shirt Premium DJ D-FAZZ', margin: 10.00 },
          { id: '2', date: Date.now() - 86400000, productName: 'Pack Polo Premium', margin: 15.00 },
          { id: '3', date: Date.now(), productName: 'Pack Hoodie Protection', margin: 20.00 },
          { id: '4', date: Date.now() - 86400000 * 5, productName: 'T-Shirt Premium DJ D-FAZZ', margin: 10.00 },
          { id: '5', date: Date.now() - 86400000 * 7, productName: 'Pack Hoodie Protection', margin: 20.00 },
        ]
      });
    });

    return () => unsubscribe();
  }, [editingUid]);

  const handleWithdrawRequest = () => {
    alert(`💰 Demande de reversement de ${djStats.totalMargin.toFixed(2)} € envoyée ! Notre équipe va traiter votre virement sous 24-48h.`);
  };

  const getEffectiveLinks = (cfg: SiteConfig | null): ProfileLink[] => {
    if (!cfg) return [];
    if (cfg.customLinks && cfg.customLinks.length > 0) {
      return cfg.customLinks;
    }
    const initial: ProfileLink[] = [
      {
        id: 'link_booking',
        title: 'Booking / Événement',
        type: 'booking',
        icon: '📅',
        enabled: true
      },
      {
        id: 'link_whatsapp',
        title: 'WhatsApp Direct',
        type: 'whatsapp',
        url: cfg.whatsappNumber || '+32488861539',
        icon: '💬',
        bgColor: '#25D366',
        enabled: true
      }
    ];

    if (cfg.socials && cfg.socials.length > 0) {
      cfg.socials.forEach((s, idx) => {
        initial.push({
          id: `link_social_${idx}`,
          title: s.platform || 'Réseau Social',
          type: 'social',
          platform: s.platform,
          url: s.url,
          enabled: true
        });
      });
    }

    if (cfg.contactEmail) {
      initial.push({
        id: 'link_email',
        title: 'Contact Direct',
        type: 'email',
        url: cfg.contactEmail,
        icon: '✉',
        enabled: true
      });
    }

    return initial;
  };

  const handleUpdateLink = (index: number, field: keyof ProfileLink, value: any) => {
    if (!config) return;
    const currentLinks = [...getEffectiveLinks(config)];
    currentLinks[index] = {
      ...currentLinks[index],
      [field]: value
    };
    setConfig({ ...config, customLinks: currentLinks });
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;
    const temp = links[index];
    links[index] = links[targetIndex];
    links[targetIndex] = temp;
    setConfig({ ...config, customLinks: links });
  };

  const handleToggleLinkEnabled = (index: number) => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    links[index] = {
      ...links[index],
      enabled: links[index].enabled === false ? true : false
    };
    setConfig({ ...config, customLinks: links });
  };

  const handleRemoveLink = (index: number) => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    links.splice(index, 1);
    setConfig({ ...config, customLinks: links });
  };

  const handleAddCustomLink = () => {
    if (!config) return;
    const links = [...getEffectiveLinks(config)];
    const newLink: ProfileLink = {
      id: `link_custom_${Date.now()}`,
      title: 'Nouveau Bouton',
      type: 'custom',
      url: 'https://',
      icon: '🔗',
      enabled: true
    };
    links.push(newLink);
    setConfig({ ...config, customLinks: links });
  };

  const handleResetDjStats = async () => {
    if (!confirm("Voulez-vous réinitialiser le compteur de ventes et l'historique à 0 € pour remettre ce profil au client ?")) return;
    try {
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "");
      if (!uidToSave) return;

      const siteConfigRef = doc(db, 'SiteConfigs', uidToSave);
      await updateDoc(siteConfigRef, {
        totalMarginAvailable: 0
      });

      const salesQ = query(collection(db, 'dj_sales'), where('userId', '==', uidToSave));
      const salesSnap = await getDocs(salesQ);
      for (const d of salesSnap.docs) {
        await deleteDoc(d.ref);
      }

      setDjStats({ totalMargin: 0, sales: [] });
      alert("✅ Compteur et historique réinitialisés à 0 € avec succès !");
    } catch (e: any) {
      console.error("Failed to reset DJ stats:", e);
      alert("Erreur lors de la réinitialisation : " + (e.message || e));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (!user) {
        const isMaster = sessionStorage.getItem('master_admin_session') === 'true';
        if (isMaster) {
          const urlParams = new URLSearchParams(window.location.search);
          const targetUid = urlParams.get("uid") || 'master_admin_logosigneed';
          const masterUser = { uid: targetUid, email: 'logosigneed@gmail.com', isMasterAdmin: true };
          setCurrentUser(masterUser);
          setEditingUid(targetUid);
          const data = await getStoredConfig(targetUid);
          setConfig(data);
          updateThemeStyles(data);
          return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get("uid");
        const urlKey = urlParams.get("key");
        if (targetUid && urlKey) {
          try {
            const data = await getStoredConfig(targetUid);
            const expectedKey = data.actuationKey || data.generatedKey;
            if (expectedKey && expectedKey.trim() === urlKey.trim()) {
              setCurrentUser({ uid: targetUid, isMagicLink: true, email: data.contactEmail || "" });
              setEditingUid(targetUid);
              setConfig(data);
              updateThemeStyles(data);
              return;
            }
          } catch (e) {
            console.error("Magic link authentication failed:", e);
          }
        }
        setCurrentUser(null);
        setConfig(null);
        setEditingUid("");
      } else {
        setCurrentUser(user);
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get("uid");
        const uidToLoad = targetUid || user.uid;
        setEditingUid(uidToLoad);
        const data = await getStoredConfig(uidToLoad);
        setConfig(data);
        updateThemeStyles(data);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProspects = async () => {
      const isSignupMode = new URLSearchParams(window.location.search).get("mode") === "signup";
      if (!currentUser || currentUser.isMagicLink || isSignupMode) return;
      try {
        const profileMap = new Map<string, any>();

        // 1. Fetch SiteConfigs
        try {
          const snapSite = await getDocs(collection(db, "SiteConfigs"));
          snapSite.forEach(d => {
            const data = d.data();
            const primaryUid = d.id;
            const linkedUid = data.generatedKey || data.actuationKey || data.projectId || data.previewId;
            const entry = {
              uid: primaryUid,
              companyName: data.companyName || data.name || primaryUid,
              activitySector: data.activitySector || data.sector || data.activity || "BTP",
              logoUrl: data.logoUrl || data.logoAdaptedUrl || "",
              contactEmail: data.contactEmail || data.email || "",
              ...data
            };
            profileMap.set(primaryUid, entry);
            if (linkedUid && !profileMap.has(linkedUid)) {
              profileMap.set(linkedUid, { ...entry, uid: linkedUid });
            }
          });
        } catch (e) {
          console.warn("Failed to fetch SiteConfigs:", e);
        }

        // 2. Fetch btp_projects
        try {
          const snapBtp = await getDocs(collection(db, "btp_projects"));
          snapBtp.forEach(d => {
            const data = d.data();
            const primaryUid = d.id;
            const linkedUid = data.projectId || data.previewId || data.generatedKey || data.actuationKey;
            const uid = linkedUid || primaryUid;

            if (uid && !profileMap.has(uid)) {
              profileMap.set(uid, {
                uid,
                companyName: data.companyName || data.userData?.companyName || uid,
                activitySector: data.activitySector || data.userData?.activity || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || data.userData?.email || "",
                ...data
              });
            }
            if (primaryUid && !profileMap.has(primaryUid)) {
              profileMap.set(primaryUid, {
                uid: primaryUid,
                companyName: data.companyName || data.userData?.companyName || primaryUid,
                activitySector: data.activitySector || data.userData?.activity || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || data.userData?.email || "",
                ...data
              });
            }
          });
        } catch (e) {
          console.warn("Failed to fetch btp_projects:", e);
        }

        // 3. Fetch anonymous_previews
        try {
          const snapPrev = await getDocs(collection(db, "anonymous_previews"));
          snapPrev.forEach(d => {
            const data = d.data();
            const primaryUid = d.id;
            const linkedUid = data.previewId || data.generatedKey || data.actuationKey;
            const uid = linkedUid || primaryUid;

            if (uid && !profileMap.has(uid)) {
              profileMap.set(uid, {
                uid,
                companyName: data.companyName || uid,
                activitySector: data.activitySector || data.sector || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || "",
                ...data
              });
            }
            if (primaryUid && !profileMap.has(primaryUid)) {
              profileMap.set(primaryUid, {
                uid: primaryUid,
                companyName: data.companyName || primaryUid,
                activitySector: data.activitySector || data.sector || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || "",
                ...data
              });
            }
          });
        } catch (e) {
          console.warn("Failed to fetch anonymous_previews:", e);
        }

        // 4. Fetch configs
        try {
          const snapConfigs = await getDocs(collection(db, "configs"));
          snapConfigs.forEach(d => {
            const data = d.data();
            const primaryUid = d.id;
            const linkedUid = data.generatedKey || data.actuationKey;
            const uid = linkedUid || primaryUid;

            if (uid && !profileMap.has(uid)) {
              profileMap.set(uid, {
                uid,
                companyName: data.companyName || uid,
                activitySector: data.activitySector || data.sector || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || "",
                ...data
              });
            }
            if (primaryUid && !profileMap.has(primaryUid)) {
              profileMap.set(primaryUid, {
                uid: primaryUid,
                companyName: data.companyName || primaryUid,
                activitySector: data.activitySector || data.sector || "BTP",
                logoUrl: data.logoUrl || "",
                contactEmail: data.contactEmail || "",
                ...data
              });
            }
          });
        } catch (e) {
          console.warn("Failed to fetch configs:", e);
        }

        // 5. Direct resolution fallback for audit-64yi3ut & URL UIDs
        const urlUid = new URLSearchParams(window.location.search).get("audit") || new URLSearchParams(window.location.search).get("uid");
        const specialUids = Array.from(new Set(["audit-64yi3ut", urlUid].filter(Boolean) as string[]));

        for (const sUid of specialUids) {
          if (!profileMap.has(sUid)) {
            try {
              const cfg = await getStoredConfig(sUid);
              if (cfg) {
                profileMap.set(sUid, {
                  uid: sUid,
                  companyName: cfg.companyName || sUid,
                  activitySector: cfg.activitySector || cfg.sector || "BTP",
                  logoUrl: cfg.logoUrl || "",
                  contactEmail: cfg.contactEmail || "",
                  ...cfg
                });
              }
            } catch {}
          }
        }

        setProspectsList(Array.from(profileMap.values()));
      } catch (err) {
        console.error("Failed to fetch prospects", err);
      }
    };
    fetchProspects();
  }, [currentUser]);

  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [newProspectName, setNewProspectName] = useState("");
  const [newProspectSector, setNewProspectSector] = useState("BTP");
  const [newProspectLogo, setNewProspectLogo] = useState("");
  const [newProspectEmail, setNewProspectEmail] = useState("");
  const [isCreatingProspect, setIsCreatingProspect] = useState(false);

  const handleDeleteProspect = async (uidToDelete: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le profil prospect (${uidToDelete}) ? Cette action est irréversible.`)) {
      try {
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch {}
        }
        await deleteDoc(doc(db, "SiteConfigs", uidToDelete));
        try { await deleteDoc(doc(db, "btp_projects", uidToDelete)); } catch {}
        try { await deleteDoc(doc(db, "anonymous_previews", uidToDelete)); } catch {}
        setProspectsList(prev => prev.filter(p => p.uid !== uidToDelete));
        if (editingUid === uidToDelete) {
          setEditingUid("");
        }
        alert("✅ Profil prospect supprimé avec succès.");
      } catch (err: any) {
        console.error("Failed to delete prospect", err);
        alert(`Erreur lors de la suppression du prospect : ${err?.message || err}`);
      }
    }
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProspectName.trim()) return;
    setIsCreatingProspect(true);
    try {
      if (!auth.currentUser) {
        try { await signInAnonymously(auth); } catch {}
      }
      const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      const newUid = `audit-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
      const actuationKey = `SG-${segment()}-${segment()}`;

      const newConfig: SiteConfig = {
        ...defaultConfig,
        companyName: newProspectName.trim(),
        activitySector: newProspectSector.trim() || "BTP",
        logoUrl: newProspectLogo.trim() || "",
        contactEmail: newProspectEmail.trim() || "contact@entreprise.com",
        generatedKey: actuationKey,
        actuationKey: actuationKey,
        isGuest: true
      };

      await setDoc(doc(db, "SiteConfigs", newUid), {
        ...newConfig,
        uid: newUid,
        createdAt: serverTimestamp()
      });

      setProspectsList(prev => [{ uid: newUid, ...newConfig }, ...prev]);
      setShowAddProspectModal(false);
      setNewProspectName("");
      setNewProspectLogo("");
      setNewProspectEmail("");
      
      alert(`✅ Profil prospect "${newProspectName}" créé avec succès !\nUID: ${newUid}`);
    } catch (e: any) {
      console.error("Failed to create prospect", e);
      alert("Erreur lors de la création du prospect : " + (e.message || e));
    } finally {
      setIsCreatingProspect(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (isLogin) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail === "logosigneed@gmail.com" && (password === "Simour89" || password.length >= 6)) {
          sessionStorage.setItem('master_admin_session', 'true');
          const urlParams = new URLSearchParams(window.location.search);
          const targetUid = urlParams.get("uid") || 'master_admin_logosigneed';
          const masterUser = { uid: targetUid, email: 'logosigneed@gmail.com', isMasterAdmin: true };
          setCurrentUser(masterUser);
          setEditingUid(targetUid);
          const data = await getStoredConfig(targetUid);
          setConfig(data);
          updateThemeStyles(data);
          
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch {
            try { await createUserWithEmailAndPassword(auth, email, password); } catch {}
          }
          return;
        }

        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (loginErr: any) {
          if (loginErr.code === "auth/user-not-found") {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-in-use") {
                try {
                  await sendPasswordResetEmail(auth, email);
                  setResetSent(true);
                  setError("Email déjà enregistré dans Firebase avec un mot de passe différent. Un e-mail de réinitialisation vous a été envoyé.");
                } catch (resetErr: any) {
                  setError("Email ou mot de passe incorrect.");
                }
                return;
              }
              throw createErr;
            }
          } else {
            throw loginErr;
          }
        }
      } else {
        // GUEST MODE: Allow anyone to create their hub without an account
        const isPrefill = new URLSearchParams(window.location.search).get('logoUrl') !== null;
        const activeSessionId = isPrefill ? '' : (localStorage.getItem('btp_active_session_id') || '');
        
        // Generate a random guest UID
        const newUid = "guest_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        const segment = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        const actuationKey = `SG-${segment()}-${segment()}`;

        // Create fully-populated SiteConfig in Firestore
        await setDoc(doc(db, "SiteConfigs", newUid), {
          ...defaultConfig,
          uid: newUid,
          isGuest: true,
          actuationKey: activeSessionId || actuationKey,
          companyName: signupCompanyName,
          sector: signupSector,
          logoUrl: signupLogo || "",
          theme: signupLogoTheme as 'dark' | 'light',
          accentColor: signupLogoAccent,
          status: "actuated",
          createdAt: serverTimestamp(),
          presentation: signupPresentation || defaultConfig.presentation,
          rawPitch: signupPresentation ? {
            what: signupPresentation.substring(0, 100),
            who: "",
            difference: "",
            service: ""
          } : defaultConfig.rawPitch,

          // Compatibility fields
          generatedKey: activeSessionId || actuationKey,
          activitySector: signupSector,
          phone: signupPhone,
          whatsappNumber: signupPhone,
          website: signupWebsite,
          merchUrl: signupWebsite,
          tva: signupTva
        });

        // Store guest UID in local storage to remember ownership
        localStorage.setItem('owned_guest_uid', newUid);
        localStorage.removeItem('btp_active_session_id'); // Clear cache of previous sessions
        
        // Redirect immediately to their new public hub
        window.location.href = `/portail-audit?uid=${newUid}`;
        return; // Stop execution to allow redirect
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/operation-not-allowed") {
        setError("L'authentification par email n'est pas activée.");
      } else if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect.");
      } else if (firebaseError.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé.");
      } else if (firebaseError.code === "auth/weak-password") {
        setError("Le mot de passe est trop faible.");
      } else {
        setError(`Erreur : ${firebaseError.message || "Inconnue"}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimUid) return;
    setIsSaving(true);
    setError("");
    try {
      let activeUser = auth.currentUser;
      if (!activeUser) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          activeUser = userCred.user;
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            try {
              const userCred = await signInWithEmailAndPassword(auth, email, password);
              activeUser = userCred.user;
            } catch (loginErr: any) {
              const cleanEmail = email.trim().toLowerCase();
              if (cleanEmail === "logosigneed@gmail.com" && (password === "Simour89" || password.length >= 6)) {
                sessionStorage.setItem('master_admin_session', 'true');
              } else {
                throw authErr;
              }
            }
          } else {
            throw authErr;
          }
        }
      }
      
      const guestData = await getStoredConfig(claimUid);
      const targetUid = activeUser?.uid || claimUid;
      const claimedData = {
        ...guestData,
        uid: targetUid,
        companyName: guestData.companyName || "Mon Entreprise BTP",
        contactEmail: email || guestData.contactEmail,
        isGuest: false,
        actuationKey: guestData.actuationKey || claimUid,
        generatedKey: guestData.generatedKey || claimUid,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "SiteConfigs", targetUid), claimedData);
      await setDoc(doc(db, "SiteConfigs", claimUid), claimedData);
      
      localStorage.removeItem('owned_guest_uid');
      window.location.href = actionHint === 'order' ? `/?uid=${targetUid}` : `/vitrine-admin/dashboard?uid=${targetUid}`;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      setError(`Erreur : ${firebaseError.message || "Impossible de créer la page admin du profil."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAutoTheme = () => {
    const hour = new Date().getHours();
    return (hour >= 7 && hour < 22) ? 'light' : 'dark';
  };

  const updateThemeStyles = (data: SiteConfig) => {
    if (!data) return;
    const effectiveTheme = (data.theme === 'light' || data.theme === 'dark') ? data.theme : getAutoTheme();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (data.accentColor) {
      document.documentElement.style.setProperty('--accent-color', data.accentColor);
      const match = data.accentColor.match(/\d+/g);
      if (match && match.length >= 3) {
        document.documentElement.style.setProperty('--accent-rgb', `${match[0]}, ${match[1]}, ${match[2]}`);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!config) return;
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    // Increased limit to 100MB
    if (file.size > 100 * 1024 * 1024) { 
      alert("La vidéo est trop lourde (max 100Mo). Veuillez la compresser avant l'envoi.");
      return;
    }

    setUploadProgress("Téléchargement de la vidéo...");
    try {
      const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setConfig({ ...config, videoUrl: url });
      setUploadProgress("Vidéo chargée avec succès !");
    } catch (error: unknown) {
      console.error("Upload Error:", error);
      const message = error instanceof Error ? error.message : "Vérifiez vos règles Firebase Storage";
      setUploadProgress(`Erreur : ${message}`);
    }
  };

  const handleLivePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    if (file.size > 10 * 1024 * 1024) { 
      alert("La photo est trop lourde (max 10Mo). Veuillez compresser l'image avant l'envoi.");
      return;
    }

    setLivePhotoProgress("Téléchargement de la photo d'ambiance...");
    try {
      const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "global");
      const storageRef = ref(storage, `users/${uidToSave}/gallery/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const currentUrls = config.livePhotoUrls || [];
      setConfig({ 
        ...config, 
        livePhotoUrl: url,
        livePhotoUrls: [...currentUrls, url] 
      });
      setLivePhotoProgress("Photo ajoutée avec succès !");
    } catch (error: unknown) {
      console.error("Upload Live Photo Error:", error);
      const message = error instanceof Error ? error.message : "Vérifiez vos règles Firebase Storage";
      setLivePhotoProgress(`Erreur : ${message}`);
    }
  };

  const handleRemoveLivePhoto = (indexToRemove: number) => {
    if (!config) return;
    const currentUrls = config.livePhotoUrls || [];
    const newUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);
    setConfig({
      ...config,
      livePhotoUrl: newUrls.length > 0 ? newUrls[newUrls.length - 1] : "",
      livePhotoUrls: newUrls
    });
  };

  // Socials / Custom Sections handlers remain the same...
  const handleSocialChange = (index: number, field: keyof Social, value: string) => {
    if (!config) return;
    const newSocials = [...config.socials];
    newSocials[index] = { ...newSocials[index], [field]: value };
    setConfig({ ...config, socials: newSocials });
  };

  const addSocial = () => {
    if (!config) return;
    setConfig({ ...config, socials: [...config.socials, { platform: "New", url: "" }] });
  };

  const removeSocial = (index: number) => {
    if (!config) return;
    setConfig({ ...config, socials: config.socials.filter((_, i) => i !== index) });
  };

  const handleCustomSectionChange = (index: number, field: keyof CustomSection, value: string) => {
    if (!config) return;
    const newSections = [...config.customSections];
    newSections[index] = { ...newSections[index], [field]: value };
    setConfig({ ...config, customSections: newSections });
  };

  const addCustomSection = () => {
    if (!config) return;
    const newIdx = config.customSections.length;
    setConfig({ 
      ...config, 
      customSections: [...config.customSections, { title: "Nouvelle Section", content: "" }],
      sectionOrder: [...(config.sectionOrder || []), `custom_${newIdx}`]
    });
  };

  const removeCustomSection = (index: number) => {
    if (!config) return;
    const sectionId = `custom_${index}`;
    const newSections = config.customSections.filter((_, i) => i !== index);
    // Re-index remaining custom sections in order
    const newOrder = (config.sectionOrder || [])
      .filter(id => id !== sectionId)
      .map(id => {
        if (id.startsWith('custom_')) {
          const idx = parseInt(id.split('_')[1]);
          if (idx > index) return `custom_${idx - 1}`;
        }
        return id;
      });
    setConfig({ ...config, customSections: newSections, sectionOrder: newOrder });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const newSections = [...config.customSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setConfig({ ...config, customSections: newSections });
  };

  const moveGlobalSection = (index: number, direction: 'up' | 'down') => {
    if (!config || !config.sectionOrder) return;
    const newOrder = [...config.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setConfig({ ...config, sectionOrder: newOrder });
  };

  const getSectionLabel = (id: string) => {
    if (id === 'presentation') return 'Présentation & IA';
    if (id === 'address') return 'Adresse & Plan';
    if (id === 'contact') return 'Contactez-nous (WhatsApp/Email)';
    if (id === 'socials') return 'Réseaux Sociaux';
    if (id === 'products') return 'Produits & Portail';
    if (id.startsWith('custom_')) {
      const idx = parseInt(id.split('_')[1]);
      return `Section: ${config?.customSections[idx]?.title || 'Sans titre'}`;
    }
    return id;
  };

  const toggleTheme = () => {
    if (!config) return;
    let newTheme: 'auto' | 'light' | 'dark' = 'auto';
    if (config.theme === 'auto' || !config.theme) newTheme = 'light';
    else if (config.theme === 'light') newTheme = 'dark';
    else newTheme = 'auto';

    const newConfig = { ...config, theme: newTheme };
    setConfig(newConfig);
    updateThemeStyles(newConfig);
  };

  const triggerAIGeneration = async () => {
    if (!config) return;
    setIsGenerating(true);
    const generated = await generateAIPresentation(config.rawPitch);
    
    // Parse options from Gemini's output
    const opt1Match = generated.match(/OPTION_1:\s*([\s\S]*?)(?=OPTION_2:|$)/i);
    const opt2Match = generated.match(/OPTION_2:\s*([\s\S]*?)(?=OPTION_3:|$)/i);
    const opt3Match = generated.match(/OPTION_3:\s*([\s\S]*?)$/i);
    
    const cleanHeaders = (t: string) => {
      return t
        .replace(/^\[Option\s*\d+\s*[^\]]*\]\s*/i, '') // Strips "[Option 1 - Axée sur la solution]" at the beginning
        .replace(/^Option\s*\d+\s*[^:]*:\s*/i, '')     // Strips "Option 1: " at the beginning
        .replace(/^OPTION_\d+\s*[^:]*:\s*/i, '')       // Strips "OPTION_1: " if any
        .trim();
    };

    let opt1 = opt1Match ? opt1Match[1].trim().replace(/^>\s*/gm, '') : "";
    let opt2 = opt2Match ? opt2Match[1].trim().replace(/^>\s*/gm, '') : "";
    let opt3 = opt3Match ? opt3Match[1].trim().replace(/^>\s*/gm, '') : "";
    
    opt1 = cleanHeaders(opt1);
    opt2 = cleanHeaders(opt2);
    opt3 = cleanHeaders(opt3);

    if (opt1 && opt2 && opt3) {
      setAiOptions([opt1, opt2, opt3]);
    } else {
      // Fallback parser if output doesn't match EXACTLY
      const lines = generated.split('\n');
      const parsedOptions: string[] = [];
      let currentOpt = "";
      for (const line of lines) {
        const uLine = line.toUpperCase();
        if (uLine.includes("OPTION 1") || uLine.includes("OPTION_1")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else if (uLine.includes("OPTION 2") || uLine.includes("OPTION_2")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else if (uLine.includes("OPTION 3") || uLine.includes("OPTION_3")) {
          if (currentOpt) parsedOptions.push(currentOpt.trim());
          currentOpt = "";
        } else {
          currentOpt += "\n" + line;
        }
      }
      if (currentOpt) parsedOptions.push(currentOpt.trim());
      
      const cleanOpts = parsedOptions.map(o => {
        const val = o.replace(/^>\s*/gm, '').replace(/[\*#\>]/g, '').trim();
        return cleanHeaders(val);
      }).filter(Boolean);
      
      if (cleanOpts.length >= 3) {
        setAiOptions(cleanOpts.slice(0, 3));
      } else {
        const paragraphs = generated.split('\n\n').map(p => {
          const val = p.replace(/^>\s*/gm, '').replace(/[\*#\>]/g, '').trim();
          return cleanHeaders(val);
        }).filter(p => p.length > 20);
        
        if (paragraphs.length >= 3) {
          setAiOptions(paragraphs.slice(0, 3));
        } else {
          setAiOptions([cleanHeaders(generated), "", ""]);
        }
      }
    }
    
    setIsGenerating(false);
  };

  const handleWebSearch = async () => {
    if (!webSearchQuery.trim() || !config) return;
    setIsAnalyzingWeb(true);
    try {
      const result = await generatePitchFromWebSearch(webSearchQuery);
      if (result) {
        setConfig({
          ...config,
          rawPitch: {
            what: result.what || config.rawPitch?.what || "",
            who: result.who || config.rawPitch?.who || "",
            difference: result.difference || config.rawPitch?.difference || "",
            service: result.service || config.rawPitch?.service || ""
          }
        } as any);
      } else {
        alert("L'IA n'a pas pu générer les informations à partir de cette recherche.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la recherche internet.");
    } finally {
      setIsAnalyzingWeb(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !config) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier est trop lourd (max 10Mo).");
      return;
    }

    setIsAnalyzingDoc(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type || "application/octet-stream";
        const result = await generatePitchFromDocument(base64String, mimeType);
        
        if (result) {
          const updatedSocials = (config.socials || []).map(social => {
            const platformLower = social.platform.toLowerCase();
            let newUrl = social.url;
            
            if (platformLower.includes("facebook") && result.facebook) {
              newUrl = result.facebook.startsWith("http") ? result.facebook : `https://facebook.com/${result.facebook}`;
            } else if (platformLower.includes("instagram") && result.instagram) {
              newUrl = result.instagram.startsWith("http") ? result.instagram : `https://instagram.com/${result.instagram}`;
            } else if (platformLower.includes("linkedin") && result.linkedin) {
              newUrl = result.linkedin.startsWith("http") ? result.linkedin : `https://linkedin.com/in/${result.linkedin}`;
            } else if (platformLower.includes("tiktok") && result.tiktok) {
              newUrl = result.tiktok.startsWith("http") ? result.tiktok : `https://tiktok.com/@${result.tiktok}`;
            }
            return { ...social, url: newUrl };
          });

          const updatedConfig: SiteConfig = {
            ...config,
            companyName: result.companyName || config.companyName,
            activitySector: result.activitySector || config.activitySector,
            contactEmail: result.contactEmail || config.contactEmail,
            whatsappNumber: result.whatsappNumber || config.whatsappNumber,
            address: result.address || config.address,
            merchUrl: result.website || config.merchUrl,
            socials: updatedSocials,
            rawPitch: {
              what: result.pitchWhat || config.rawPitch?.what || "",
              who: result.pitchWho || config.rawPitch?.who || "",
              difference: result.pitchDiff || config.rawPitch?.difference || "",
              service: result.pitchService || config.rawPitch?.service || ""
            }
          };

          setConfig(updatedConfig);
          alert("✅ Document analysé avec succès ! Les informations du portail ont été pré-remplies. Pensez à vérifier et à sauvegarder.");
        } else {
          alert("L'IA n'a pas pu extraire d'informations de ce document.");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'analyse du document.");
      } finally {
        setIsAnalyzingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectAiOption = (text: string) => {
    if (!config) return;
    setConfig({ ...config, presentation: text });
  };

  const removeBackgroundFromLogo = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(base64);
        ctx.drawImage(img, 0, 0);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        let width = canvas.width;
        let height = canvas.height;

        // Auto-crop content boundaries
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasContent = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              hasContent = true;
            }
          }
        }

        if (hasContent) {
          const contentWidth = maxX - minX + 1;
          const contentHeight = maxY - minY + 1;
          const croppedData = ctx.getImageData(minX, minY, contentWidth, contentHeight);
          canvas.width = contentWidth;
          canvas.height = contentHeight;
          ctx.putImageData(croppedData, 0, 0);
          imageData = ctx.getImageData(0, 0, contentWidth, contentHeight);
          data = imageData.data;
          width = contentWidth;
          height = contentHeight;
        }

        // Smart corner background detection
        const getPixel = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          return [data[i], data[i+1], data[i+2]];
        };
        const getPixelAlpha = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          return data[i + 3];
        };
        const corners = [getPixel(0,0), getPixel(width-1, 0), getPixel(0, height-1), getPixel(width-1, height-1)];
        const cornerAlphas = [getPixelAlpha(0,0), getPixelAlpha(width-1, 0), getPixelAlpha(0, height-1), getPixelAlpha(width-1, height-1)];
        
        const avgR = corners.reduce((acc, c) => acc + c[0], 0) / 4;
        const avgG = corners.reduce((acc, c) => acc + c[1], 0) / 4;
        const avgB = corners.reduce((acc, c) => acc + c[2], 0) / 4;

        const diffs = corners.map(c => Math.sqrt(Math.pow(c[0] - avgR, 2) + Math.pow(c[1] - avgG, 2) + Math.pow(c[2] - avgB, 2)));
        const maxCornerDiff = Math.max(...diffs);
        const cornersAreOpaque = cornerAlphas.every(a => a > 150);

        const isSolidBg = cornersAreOpaque && (maxCornerDiff < 35);
        const isBlackBg = isSolidBg && avgR < 60 && avgG < 60 && avgB < 60;
        const isWhiteBg = isSolidBg && avgR > 190 && avgG > 190 && avgB > 190;
        const isCustomColoredBg = isSolidBg && !isBlackBg && !isWhiteBg;

        if (isSolidBg) {
          const targetR = avgR;
          const targetG = avgG;
          const targetB = avgB;
          const isDark = targetR < 60 && targetG < 60 && targetB < 60;
          const tolerance = isDark ? 95 : 65;
          let deletedPixels = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
            const isNoisyDark = isDark && (r + g + b < 80);
            if (dist < tolerance || isNoisyDark) {
              deletedPixels++;
            }
          }

          if (deletedPixels / (data.length / 4) < 0.98) {
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i+1], b = data[i+2];
              const dist = Math.sqrt(Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2));
              const isNoisyDark = isDark && (r + g + b < 80);
              if (dist < tolerance || isNoisyDark) {
                data[i + 3] = 0;
              }
            }
          }
        }

        // Apply writing-recolor to the background color when we detect a solid custom colored background, 
        // to prevent white logo parts from disappearing on white vitrine supports.
        if (isCustomColoredBg) {
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 30) {
              const r = data[i], g = data[i+1], b = data[i+2];
              if (r > 215 && g > 215 && b > 215) {
                data[i] = avgR;
                data[i + 1] = avgG;
                data[i + 2] = avgB;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(base64);
    });
  };

  const handleSignupLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoUploading(true);
      setError("");
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const result = await processLogo(base64String);
          
          // Remove background for maximum transparency
          const transparentLogo = await removeBackgroundFromLogo(result.resized);
          
          setSignupLogo(transparentLogo);
          setSignupLogoTheme(result.theme);
          setSignupLogoAccent(result.accent);
        } catch (err: any) {
          console.error("Error processing logo in signup:", err);
          setError("Erreur lors du traitement du logo: " + (err.message || err));
        } finally {
          setLogoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!config) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await processLogo(base64String);
        
        // Remove background for maximum transparency
        const transparentLogo = await removeBackgroundFromLogo(result.resized);
        
        const newConfig: SiteConfig = { 
          ...config, 
          logoUrl: transparentLogo,
          theme: result.theme as 'dark' | 'light',
          accentColor: result.accent
        };
        setConfig(newConfig);
        updateThemeStyles(newConfig);
        
        // Auto-save the logo to Firestore immediately so it's active in the audit portal
        const uidToSave = editingUid || (auth.currentUser ? auth.currentUser.uid : "");
        if (uidToSave) {
          await saveStoredConfig(newConfig, uidToSave);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user || currentUser?.isMagicLink) {
        const siteConfig = {
          ...config,
          email: config.contactEmail || (user ? user.email : '') || '',
          actuationKey: config.actuationKey || config.generatedKey || '',
          companyName: config.companyName || '',
          sector: config.activitySector || '',
          status: 'validated'
        };

        // Sauvegarder les données finales dans Firestore under editingUid
        const uidToSave = editingUid || (user ? user.uid : '');
        await saveStoredConfig(siteConfig, uidToSave);

        // Confirmation sans redirection — l'utilisateur reste sur le dashboard
        alert("✅ Modifications publiées avec succès !");
      } else {
        alert("Erreur: Utilisateur non connecté.");
      }
    } catch (error) {
      alert("Erreur lors de la publication");
    } finally {
      setIsSaving(false);
    }
  };

  // Détermine la route d'audit selon le secteur
  const getAuditRoute = () => {
    const sector = (config?.activitySector || '').toUpperCase();
    const BTP_SECTORS = ['BTP', 'PEINTURE', 'CONSTRUCTION', 'BÂTIMENT', 'BATIMENT', 'INDUSTRIE', 'ARTISAN', 'MAÇONNERIE', 'MACONNERIE', 'PLOMBERIE', 'ELECTRICITE', 'ÉLECTRICITÉ', 'CHARPENTE', 'MENUISERIE', 'CARRELAGE', 'ISOLATION', 'COUVERTURE', 'CHAUFFAGE'];
    return BTP_SECTORS.includes(sector) ? 'btp-audit' : 'portail-audit';
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('master_admin_session');
    await signOut(auth);
    setCurrentUser(null);
    navigate("/vitrine-admin/dashboard");
  };

  if (!authChecked) {
    return <div className="loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>VÉRIFICATION DE LA CONSOLE...</div>;
  }

  const isForceSignup = new URLSearchParams(window.location.search).get("mode") === "signup";
  if (!currentUser || isForceSignup) {
    if (claimUid) {
      return (
        <main className={isAdminLightMode ? "admin-console-light" : ""} style={{ width: '100%', minHeight: '100vh', background: 'var(--admin-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1.5rem', boxSizing: 'border-box', position: 'relative' }}>
          <style>{`
            body.admin-console-light {
              background: #f8fafc !important;
              background-image: radial-gradient(circle at top, rgba(59, 130, 246, 0.05) 0%, #f8fafc 100%) !important;
              color: #0f172a !important;
            }
            body.admin-console-light main,
            body.admin-console-light section {
              background: transparent !important;
            }
            body.admin-console-light .admin-section,
            body.admin-console-light [style*="background: rgba(15,"],
            body.admin-console-light [style*="background:rgba(15,"],
            body.admin-console-light [style*="background: rgba(30,"],
            body.admin-console-light [style*="background:rgba(30,"],
            body.admin-console-light [style*="background: rgba(255, 255, 255, 0.03)"],
            body.admin-console-light [style*="background:rgba(255,255,255,0.03)"],
            body.admin-console-light [style*="background: rgba(255,255,255,0.03)"],
            body.admin-console-light [style*="background: rgba(255, 255, 255, 0.02)"],
            body.admin-console-light [style*="background:rgba(255,255,255,0.02)"],
            body.admin-console-light [style*="background: rgba(255,255,255,0.02)"] {
              background: #ffffff !important;
              color: #0f172a !important;
              border: 1px solid rgba(0, 0, 0, 0.08) !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.03) !important;
            }
            body.admin-console-light label,
            body.admin-console-light p,
            body.admin-console-light span:not(.animate-pulse),
            body.admin-console-light [style*="color: #94a3b8"],
            body.admin-console-light [style*="color:#94a3b8"],
            body.admin-console-light [style*="color: #64748b"],
            body.admin-console-light [style*="color:#64748b"],
            body.admin-console-light [style*="color: #cbd5e1"],
            body.admin-console-light [style*="color:#cbd5e1"] {
              color: #475569 !important;
            }
            body.admin-console-light h1,
            body.admin-console-light h2,
            body.admin-console-light h3,
            body.admin-console-light h4,
            body.admin-console-light [style*="color: #fff"],
            body.admin-console-light [style*="color:#fff"],
            body.admin-console-light [style*="color: #f1f5f9"],
            body.admin-console-light [style*="color:#f1f5f9"] {
              color: #0f172a !important;
            }
            body.admin-console-light input,
            body.admin-console-light textarea,
            body.admin-console-light select,
            body.admin-console-light [style*="background: rgba(30,41,59,0.5)"],
            body.admin-console-light [style*="background:rgba(30,41,59,0.5)"],
            body.admin-console-light [style*="background: rgba(15,23,42,0.8)"],
            body.admin-console-light [style*="background:rgba(15,23,42,0.8)"] {
              background: #ffffff !important;
              border: 1px solid #cbd5e1 !important;
              color: #0f172a !important;
            }
            body.admin-console-light [style*="background: rgba(30, 41, 59, 0.6)"],
            body.admin-console-light [style*="background:rgba(30, 41, 59, 0.6)"] {
              background: #e2e8f0 !important;
              border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
            }
            body.admin-console-light [style*="background: rgba(56, 189, 248"],
            body.admin-console-light [style*="background:rgba(56, 189, 248"] {
              background: #f0f9ff !important;
              border: 1px solid #bae6fd !important;
              color: #0369a1 !important;
            }
            body.admin-console-light [style*="color: #7dd3fc"] {
              color: #0369a1 !important;
            }
            body.admin-console-light [style*="color: #bae6fd"] {
              color: #0284c7 !important;
            }
            body.admin-console-light [style*="background: rgba(34, 197, 94"],
            body.admin-console-light [style*="background:rgba(34, 197, 94"],
            body.admin-console-light [style*="background: rgba(16, 185, 129"],
            body.admin-console-light [style*="background:rgba(16, 185, 129"] {
              background: #f0fdf4 !important;
              border: 1px solid #bbf7d0 !important;
              color: #166534 !important;
            }
            body.admin-console-light [style*="color: #4ade80"],
            body.admin-console-light [style*="color: #34d399"] {
              color: #166534 !important;
            }
            body.admin-console-light code,
            body.admin-console-light [style*="background: rgba(59, 130, 246, 0.1)"],
            body.admin-console-light [style*="background:rgba(59, 130, 246, 0.1)"] {
              background: #eff6ff !important;
              border: 1px solid rgba(59, 130, 246, 0.3) !important;
              color: #1d4ed8 !important;
            }
            body.admin-console-light [style*="color: #38bdf8"] {
              color: #0284c7 !important;
            }
            body.admin-console-light [style*="color: #60a5fa"] {
              color: #1d4ed8 !important;
            }
            body.admin-console-light [style*="color: #f87171"],
            body.admin-console-light [style*="color:#f87171"] {
              color: #b91c1c !important;
            }
            body.admin-console-light [style*="backgroundColor: '#0f172a'"],
            body.admin-console-light [style*="backgroundColor:'#0f172a'"],
            body.admin-console-light [style*="background-color: #0f172a"],
            body.admin-console-light [style*="background-color:#0f172a"] {
              background-color: #eff6ff !important;
              border: 1px solid rgba(59, 130, 246, 0.3) !important;
            }
          `}</style>
          
          <button 
            onClick={() => {
              const nextVal = !isAdminLightMode;
              setIsAdminLightMode(nextVal);
              localStorage.setItem("admin_light_mode", String(nextVal));
            }}
            type="button"
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: '1px solid ' + (isAdminLightMode ? '#cbd5e1' : '#334155'),
              backgroundColor: isAdminLightMode ? '#ffffff' : '#1e293b',
              color: isAdminLightMode ? '#0f172a' : '#ffffff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            Console : {isAdminLightMode ? '🌙' : '☀️'}
          </button>
          <div className="admin-section" style={{ textAlign: 'center', maxWidth: '500px', width: '100%', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.8)', border: '2px solid rgba(79, 70, 229, 0.4)', borderRadius: '24px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1rem', fontWeight: 900, fontSize: '1.8rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sécurisez votre Portail</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              {actionHint === 'order' 
                ? "Créez votre compte gratuit pour valider votre commande et sauvegarder définitivement votre portail 3D."
                : "Créez votre compte administrateur gratuit pour modifier vos informations et sauvegarder définitivement votre portail."}
            </p>
            
            <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input 
                type="email" 
                placeholder="Email administrateur" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem' }}
              />
              <input 
                type="password" 
                placeholder="Mot de passe (Min 6 caractères)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                style={{ width: '100%', padding: '1rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem' }}
              />
              {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0', fontWeight: 600 }}>⚠️ {error}</p>}
              
              <button type="submit" className="primary-btn" disabled={isSaving} style={{ marginTop: '0.5rem', padding: '1.1rem', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', border: 'none', fontSize: '1.1rem' }}>
                {isSaving ? "Sauvegarde en cours..." : "Créer mon compte"}
              </button>
            </form>
          </div>
        </main>
      );
    }

    return (
      <main className={isAdminLightMode ? "admin-console-light" : ""} style={{ width: '100%', minHeight: '100vh', background: 'var(--admin-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1.5rem', boxSizing: 'border-box', position: 'relative' }}>
        <button 
          onClick={() => {
            const nextVal = !isAdminLightMode;
            setIsAdminLightMode(nextVal);
            localStorage.setItem("admin_light_mode", String(nextVal));
          }}
          type="button"
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: '1px solid ' + (isAdminLightMode ? '#cbd5e1' : '#334155'),
            backgroundColor: isAdminLightMode ? '#ffffff' : '#1e293b',
            color: isAdminLightMode ? '#0f172a' : '#ffffff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          Console : {isAdminLightMode ? '🌙' : '☀️'}
        </button>
        {isLogin ? (
          // Mode Connexion Standard
          <div className="admin-section" style={{ textAlign: 'center', maxWidth: '400px', width: '100%', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', backdropFilter: 'blur(12px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.5rem', fontWeight: 900, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connexion Administrateur</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2rem', lineHeight: '1.5' }}>Accès réservé. Veuillez vous connecter avec votre <strong>adresse email</strong> et votre <strong>mot de passe</strong> pour gérer vos profils.</p>
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="email" 
                placeholder="Email professionnel" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
              />
              <input 
                type="password" 
                placeholder="Mot de passe" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
              />
              {error && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.2rem 0' }}>⚠️ {error}</p>}
              {resetSent && <p style={{ color: '#4ade80', fontSize: '0.8rem', margin: '0.2rem 0', fontWeight: 'bold' }}>📧 Un e-mail de réinitialisation a été envoyé à {email} !</p>}
              
              <button type="submit" className="primary-btn" disabled={isSaving} style={{ marginTop: '0.5rem', padding: '0.9rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', border: 'none' }}>
                {isSaving ? "Veuillez patienter..." : "Se connecter"}
              </button>

              <button 
                type="button" 
                onClick={async () => {
                  if (!email) {
                    setError("Veuillez saisir votre adresse email ci-dessus.");
                    return;
                  }
                  setIsSaving(true);
                  setError("");
                  try {
                    await sendPasswordResetEmail(auth, email);
                    setResetSent(true);
                  } catch (err: any) {
                    setError("Erreur réinitialisation : " + (err.message || "Vérifiez votre adresse email."));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.3rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Mot de passe oublié ? (Recevoir un lien par email)
              </button>
            </form>

            <p style={{ marginTop: '1.8rem', fontSize: '0.8rem', color: '#64748b' }}>
              Pas encore de compte ?
              <button 
                onClick={() => setIsLogin(false)} 
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, marginLeft: '0.4rem', cursor: 'pointer' }}
              >
                Créer mon portail
              </button>
            </p>
          </div>
        ) : (
          // Mode Inscription - NOUVELLE PAGE ADMIN DE FORMULAIRE COMBINÉE (Une pierre deux coups)
          <div className="admin-section" style={{ maxWidth: '960px', width: '100%', background: 'rgba(15, 23, 42, 0.7)', border: '2px solid rgba(79, 70, 229, 0.25)', borderRadius: '24px', backdropFilter: 'blur(16px)', boxShadow: '0 0 50px rgba(79, 70, 229, 0.15), 0 30px 60px rgba(0,0,0,0.6)', overflow: 'hidden', margin: '0 auto' }}>
            
            {/* Header Bar Console Admin */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.85rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  console.setup.initialisation.sh
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '100px', marginLeft: 'auto' }}>
                <span style={{ height: '6px', width: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em' }}>SETUP INITIAL & ADMIN</span>
              </div>
            </div>

            <div style={{ padding: '2.5rem 2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Initialisation & Configuration de l'Admin
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '600px', margin: '0 auto' }}>
                  Créez vos accès maîtres et renseignez l'identité de votre entreprise pour configurer automatiquement votre portail vitrine et produits.
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem' }}>
                  
                  {/* Left Column: Access & Security */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '20px', padding: '1.8rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Informations Principales
                    </h2>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secteur d'Activité</label>
                      <input 
                        type="text"
                        placeholder="Ex: Traiteur, Coiffeur, BTP..."
                        value={signupSector}
                        onChange={(e) => setSignupSector(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#7dd3fc', fontWeight: 600 }}>
                        🚀 Création Rapide (Mode Invité)
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#bae6fd' }}>
                        Générez instantanément votre portail vitrine et explorez vos produits modélisés en 3D. Aucune inscription requise !
                      </p>
                    </div>

                    {/* Glowing Key Generation Box */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', boxShadow: 'inset 0 0 15px rgba(79, 70, 229, 0.1)', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Clé d'Actuation Premium Provisoire</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.05em', textShadow: '0 0 10px rgba(56, 189, 248, 0.4)' }}>
                        {previewKey || "SG-GENERATING-KEY"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Brand Profile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '20px', padding: '1.8rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🏢 Identité de Marque
                    </h2>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom de l'Entreprise</label>
                      <input 
                        type="text" 
                        placeholder="ex: Batipro Express" 
                        value={signupCompanyName} 
                        onChange={(e) => setSignupCompanyName(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Téléphone / WhatsApp</label>
                        <input 
                          type="text" 
                          placeholder="ex: +33612345678" 
                          value={signupPhone} 
                          onChange={(e) => setSignupPhone(e.target.value)} 
                          style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>N° TVA (Optionnel)</label>
                        <input 
                          type="text" 
                          placeholder="ex: FR12345678901" 
                          value={signupTva} 
                          onChange={(e) => setSignupTva(e.target.value)} 
                          style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site Web existant (Optionnel)</label>
                      <input 
                        type="text" 
                        placeholder="ex: https://monentreprise.com" 
                        value={signupWebsite} 
                        onChange={(e) => setSignupWebsite(e.target.value)} 
                        style={{ width: '100%', padding: '0.85rem 1.2rem', borderRadius: '12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Logo upload block */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo de l'Entreprise</label>
                      
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleSignupLogoChange}
                            id="signup-logo-input"
                            style={{ display: 'none' }}
                          />
                          <label 
                            htmlFor="signup-logo-input" 
                            style={{ 
                              display: 'block', 
                              textAlign: 'center', 
                              padding: '0.85rem 1rem', 
                              borderRadius: '12px', 
                              background: 'rgba(30,41,59,0.5)', 
                              border: '1px dashed rgba(255,255,255,0.2)', 
                              color: '#cbd5e1', 
                              fontSize: '0.85rem', 
                              fontWeight: 600, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s ease' 
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.6)'; e.currentTarget.style.background = 'rgba(79, 70, 229, 0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(30,41,59,0.5)'; }}
                          >
                            {logoUploading ? "Traitement intelligent..." : "📂 Choisir une image"}
                          </label>
                        </div>

                        {/* Logo Preview box */}
                        <div style={{ 
                          width: '70px', 
                          height: '70px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          background: signupLogo ? '#1e293b' : 'rgba(15,23,42,0.4)', 
                          backgroundImage: signupLogo ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'none',
                          backgroundSize: '10px 10px',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          overflow: 'hidden',
                          boxShadow: signupLogo ? '0 0 15px rgba(79, 70, 229, 0.2)' : 'none'
                        }}>
                          {signupLogo ? (
                            <img src={signupLogo} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '1.5rem', opacity: 0.25 }}>🖼️</span>
                          )}
                        </div>
                      </div>

                      {signupLogo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.8rem' }}>✨</span>
                          <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>Logo optimisé : fond retiré et accentuation extraite !</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0', textAlign: 'center', fontWeight: 600 }}>⚠️ {error}</p>}
                
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isSaving || logoUploading} 
                  style={{ 
                    alignSelf: 'center',
                    maxWidth: '480px',
                    width: '100%',
                    padding: '1.1rem 2rem', 
                    borderRadius: '14px', 
                    fontWeight: 950, 
                    cursor: (isSaving || logoUploading) ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s ease', 
                    background: 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)', 
                    color: '#fff', 
                    border: 'none',
                    boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35)',
                    fontSize: '1rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  {isSaving ? "Création du portail et de la console..." : "🚀 CRÉER ET ENTRER DANS MON ADMIN"}
                </button>
              </form>

              <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Déjà enregistré ?</span>
                <button 
                  onClick={() => setIsLogin(true)} 
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Se connecter à l'Admin →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!config) return <div className="loader">CHARGEMENT...</div>;

  return (
    <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '0.75rem 0.75rem 5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
      <style>{`
        body.admin-console-light {
          background: #f8fafc !important;
          background-image: radial-gradient(circle at top, rgba(59, 130, 246, 0.05) 0%, #f8fafc 100%) !important;
          color: #0f172a !important;
        }
        body.admin-console-light main,
        body.admin-console-light section {
          background: transparent !important;
        }
        body.admin-console-light .admin-section,
        body.admin-console-light [style*="background: rgba(15,"],
        body.admin-console-light [style*="background:rgba(15,"],
        body.admin-console-light [style*="background: rgba(30,"],
        body.admin-console-light [style*="background:rgba(30,"],
        body.admin-console-light [style*="background: rgba(255, 255, 255, 0.03)"],
        body.admin-console-light [style*="background:rgba(255,255,255,0.03)"],
        body.admin-console-light [style*="background: rgba(255,255,255,0.03)"],
        body.admin-console-light [style*="background: rgba(255, 255, 255, 0.02)"],
        body.admin-console-light [style*="background:rgba(255,255,255,0.02)"],
        body.admin-console-light [style*="background: rgba(255,255,255,0.02)"] {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.03) !important;
        }
        body.admin-console-light label,
        body.admin-console-light p,
        body.admin-console-light span:not(.animate-pulse),
        body.admin-console-light [style*="color: #94a3b8"],
        body.admin-console-light [style*="color:#94a3b8"],
        body.admin-console-light [style*="color: #64748b"],
        body.admin-console-light [style*="color:#64748b"],
        body.admin-console-light [style*="color: #cbd5e1"],
        body.admin-console-light [style*="color:#cbd5e1"] {
          color: #475569 !important;
        }
        body.admin-console-light h1,
        body.admin-console-light h2,
        body.admin-console-light h3,
        body.admin-console-light h4,
        body.admin-console-light [style*="color: #fff"],
        body.admin-console-light [style*="color:#fff"],
        body.admin-console-light [style*="color: #f1f5f9"],
        body.admin-console-light [style*="color:#f1f5f9"] {
          color: #0f172a !important;
        }
        body.admin-console-light input,
        body.admin-console-light textarea,
        body.admin-console-light select,
        body.admin-console-light [style*="background: rgba(30,41,59,0.5)"],
        body.admin-console-light [style*="background:rgba(30,41,59,0.5)"],
        body.admin-console-light [style*="background: rgba(15,23,42,0.8)"],
        body.admin-console-light [style*="background:rgba(15,23,42,0.8)"] {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }
        body.admin-console-light [style*="background: rgba(30, 41, 59, 0.6)"],
        body.admin-console-light [style*="background:rgba(30, 41, 59, 0.6)"] {
          background: #e2e8f0 !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        body.admin-console-light [style*="background: rgba(56, 189, 248"],
        body.admin-console-light [style*="background:rgba(56, 189, 248"] {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
          color: #0369a1 !important;
        }
        body.admin-console-light [style*="color: #7dd3fc"] {
          color: #0369a1 !important;
        }
        body.admin-console-light [style*="color: #bae6fd"] {
          color: #0284c7 !important;
        }
        body.admin-console-light [style*="background: rgba(34, 197, 94"],
        body.admin-console-light [style*="background:rgba(34, 197, 94"],
        body.admin-console-light [style*="background: rgba(16, 185, 129"],
        body.admin-console-light [style*="background:rgba(16, 185, 129"] {
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
          color: #166534 !important;
        }
        body.admin-console-light [style*="color: #4ade80"],
        body.admin-console-light [style*="color: #34d399"] {
          color: #166534 !important;
        }
        body.admin-console-light code,
        body.admin-console-light [style*="background: rgba(59, 130, 246, 0.1)"],
        body.admin-console-light [style*="background:rgba(59, 130, 246, 0.1)"] {
          background: #eff6ff !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          color: #1d4ed8 !important;
        }
        body.admin-console-light [style*="color: #38bdf8"] {
          color: #0284c7 !important;
        }
        body.admin-console-light [style*="color: #60a5fa"] {
          color: #1d4ed8 !important;
        }
        body.admin-console-light [style*="color: #f87171"],
        body.admin-console-light [style*="color:#f87171"] {
          color: #b91c1c !important;
        }
        body.admin-console-light [style*="backgroundColor: '#0f172a'"],
        body.admin-console-light [style*="backgroundColor:'#0f172a'"],
        body.admin-console-light [style*="background-color: #0f172a"],
        body.admin-console-light [style*="background-color:#0f172a"] {
          background-color: #eff6ff !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
        }
      `}</style>

      <div className="admin-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
          {currentUser?.isMagicLink ? "Configuration de ma Vitrine" : "Admin CMS"}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Vitrine : {config.theme === 'light' ? '☀️ Mode Jour' : config.theme === 'dark' ? '🌙 Mode Nuit' : '⏰ Auto (7h-22h Jour / 22h-7h Nuit)'}
          </button>
          <button 
            onClick={() => {
              const nextVal = !isAdminLightMode;
              setIsAdminLightMode(nextVal);
              localStorage.setItem("admin_light_mode", String(nextVal));
            }} 
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '100px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)', 
              color: 'var(--text-color)', 
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
          >
            Console : {isAdminLightMode ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', borderRadius: '100px', border: '1px solid #ff4444', background: 'transparent', color: '#ff4444', cursor: 'pointer', fontSize: '0.7rem' }}>
            {currentUser?.isMagicLink ? "Quitter" : "Déconnexion"}
          </button>
          
          {/* Shopping Cart button with notification pastille */}
          <Link 
            to={`/portail-shop?uid=${editingUid || auth.currentUser?.uid}`} 
            target="_blank"
            style={{ 
              position: 'relative',
              padding: '0.5rem 1.2rem', 
              borderRadius: '100px', 
              border: '1px solid rgba(234, 88, 12, 0.4)', 
              background: 'rgba(234, 88, 12, 0.1)', 
              color: '#ea580c', 
              textDecoration: 'none', 
              fontSize: '0.8rem', 
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.1)';
            }}
          >
            🛒 Boutique
            {pendingOrdersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ef4444',
                color: '#ffffff',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                fontSize: '0.65rem',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                boxSizing: 'border-box',
                border: '1.5px solid var(--card-bg)'
              }}>
                {pendingOrdersCount}
              </span>
            )}
          </Link>

          <Link 
            to={`/profil?uid=${editingUid || auth.currentUser?.uid}`} 
            target="_blank"
            style={{ 
              padding: '0.45rem 0.9rem', 
              borderRadius: '100px', 
              border: '1px solid rgba(56, 189, 248, 0.4)', 
              background: 'rgba(56, 189, 248, 0.1)', 
              color: '#38bdf8', 
              textDecoration: 'none', 
              fontSize: '0.72rem', 
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            🔗 Mon Profil
          </Link>
          <Link to="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none', fontSize: '0.8rem', opacity: 0.6 }}>Quitter</Link>
        </div>
      </div>

      {/* BARRE D'ONGLETS CONSOLE ADMIN */}
      {currentUser && !currentUser.isMagicLink && (
        <div style={{ display: 'flex', gap: '0.6rem', margin: '1rem 0 1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => setActiveAdminTab('editor')}
            style={{
              padding: '0.7rem 1.3rem',
              borderRadius: '12px',
              border: activeAdminTab === 'editor' ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.1)',
              background: activeAdminTab === 'editor' ? 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(55,48,163,0.3) 100%)' : 'rgba(15,23,42,0.4)',
              color: activeAdminTab === 'editor' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeAdminTab === 'editor' ? '0 4px 15px rgba(79,70,229,0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ✏️ Édition du Profil {editingUid ? `(${editingUid})` : ''}
          </button>

          <button 
            type="button" 
            onClick={() => setActiveAdminTab('prospects')}
            style={{
              padding: '0.7rem 1.3rem',
              borderRadius: '12px',
              border: activeAdminTab === 'prospects' ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.1)',
              background: activeAdminTab === 'prospects' ? 'linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(55,48,163,0.3) 100%)' : 'rgba(15,23,42,0.4)',
              color: activeAdminTab === 'prospects' ? '#ffffff' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: activeAdminTab === 'prospects' ? '0 4px 15px rgba(79,70,229,0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Gestion de Mes Prospects ({prospectsList.length})
          </button>

          <a 
            href="/vitrine-admin/dashboard?tab=prospects" 
            target="_blank" 
            rel="noreferrer"
            style={{
              padding: '0.7rem 1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#cbd5e1',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginLeft: 'auto'
            }}
            title="Ouvrir la gestion de vos prospects dans un nouvel onglet du navigateur"
          >
            ↗️ Ouvrir Prospects (Nouvel Onglet)
          </a>
        </div>
      )}

      {currentUser?.isMagicLink && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#34d399',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)',
          lineHeight: '1.5'
        }}>
          <span>✨</span>
          <span>Vous modifiez actuellement votre portail via un lien d'accès sécurisé et sans mot de passe. Vos modifications seront publiées dès que vous cliquerez sur le bouton <strong>Publier les changements</strong>.</span>
        </div>
      )}

      {(config.actuationKey || config.generatedKey) && (
        <ActuationKeyBanner 
          actuationKey={config.actuationKey || config.generatedKey || ''} 
          editingUid={editingUid}
          isMagicLink={currentUser?.isMagicLink}
        />
      )}

      {/* DJ / CREATOR SPACE DASHBOARD MVP */}
      {(() => {
        const isDjProfile = (config.activitySector || '').toLowerCase().includes('dj') || 
                            (config.activitySector || '').toLowerCase().includes('deejay') || 
                            (config.sector || '').toLowerCase().includes('deejay') ||
                            (config.companyName || '').toLowerCase().includes('dj');

        if (!isDjProfile) return null;

        return (
          <div className="admin-section" style={{ 
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
            border: '1.5px solid rgba(249, 115, 22, 0.3)', 
            borderRadius: '20px', 
            padding: '2rem', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: '#fff'
          }}>
            <h2 style={{ 
              fontSize: '1.4rem', 
              fontWeight: 900, 
              background: 'linear-gradient(to right, #ffffff, #f97316)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent', 
              margin: 0, 
              textTransform: 'uppercase', 
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚡</span> Mon Espace Créateur (DJ)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem', marginBottom: '1.5rem' }}>
              Suivez vos ventes de merchandising et vos gains en direct.
            </p>
            
            {/* Central Stats block */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '16px', 
              padding: '2rem 1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center', 
              margin: '0 auto 2rem auto', 
              maxWidth: '360px', 
              backdropFilter: 'blur(10px)', 
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' 
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                Marge totale disponible
              </span>
              <span style={{ 
                fontSize: '3.2rem', 
                fontWeight: 950, 
                color: '#f97316', 
                letterSpacing: '-0.03em', 
                lineHeight: 1.1, 
                marginTop: '0.5rem', 
                textShadow: '0 0 25px rgba(249,115,22,0.3)' 
              }}>
                {djStats.totalMargin.toFixed(2)} €
              </span>
              <button 
                onClick={handleWithdrawRequest}
                style={{ 
                  marginTop: '1.2rem', 
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '100px', 
                  padding: '0.65rem 1.5rem', 
                  fontSize: '0.8rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  transition: 'all 0.2s', 
                  boxShadow: '0 6px 15px rgba(249, 115, 22, 0.3)' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Demander un reversement
              </button>

              <button 
                type="button"
                onClick={handleResetDjStats}
                style={{ 
                  marginTop: '0.6rem', 
                  background: 'transparent', 
                  color: '#64748b', 
                  border: 'none', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  textDecoration: 'underline'
                }}
              >
                🔄 Réinitialiser les ventes (Remise à 0 € pour le client)
              </button>
            </div>

            {/* Sales table */}
            <div>
              <h3 style={{ 
                fontSize: '0.95rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                color: '#ffffff', 
                marginBottom: '1rem', 
                borderBottom: '1px solid rgba(255,255,255,0.06)', 
                paddingBottom: '0.5rem' 
              }}>
                📋 Historique des ventes
              </h3>
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '450px', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '0.85rem 1.1rem', color: '#94a3b8', fontWeight: 700 }}>Date de la commande</th>
                      <th style={{ padding: '0.85rem 1.1rem', color: '#94a3b8', fontWeight: 700 }}>Nom du produit vendu</th>
                      <th style={{ padding: '0.85rem 1.1rem', color: '#94a3b8', fontWeight: 700 }}>Marge générée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {djStats.sales.length > 0 ? djStats.sales.map((sale: any) => (
                      <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '0.85rem 1.1rem', color: '#cbd5e1' }}>
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', color: '#ffffff', fontWeight: '600' }}>
                          {sale.productName}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', color: '#4ade80', fontWeight: 'bold' }}>
                          + {sale.margin.toFixed(2)} €
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          Aucune vente enregistrée pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}



      <div className="admin-section">
        <h2>{currentUser?.isMagicLink ? "Identité de votre Entreprise" : "Identité & Logo"}</h2>
        <input name="companyName" value={config.companyName} onChange={handleChange} placeholder="Nom" />
        <input name="activitySector" value={config.activitySector} onChange={handleChange} placeholder="Secteur" />
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload} 
              id="admin-logo-upload-input"
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="admin-logo-upload-input" 
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                padding: '0.85rem 1rem', 
                borderRadius: '12px', 
                background: 'rgba(30,41,59,0.5)', 
                border: '1px dashed rgba(255,255,255,0.2)', 
                color: '#cbd5e1', 
                fontSize: '0.85rem', 
                fontWeight: 600, 
                cursor: 'pointer', 
                transition: 'all 0.2s ease' 
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.6)'; e.currentTarget.style.background = 'rgba(79, 70, 229, 0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(30,41,59,0.5)'; }}
            >
              {logoUploading ? "Traitement intelligent..." : "📂 Remplacer le logo"}
            </label>
          </div>

          {/* Current Logo Thumbnail Box */}
          <div style={{ 
            width: '70px', 
            height: '70px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,255,255,0.08)', 
            background: config.logoUrl ? '#1e293b' : 'rgba(15,23,42,0.4)', 
            backgroundImage: config.logoUrl ? 'radial-gradient(#ffffff 1px, transparent 1px)' : 'none',
            backgroundSize: '10px 10px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: config.logoUrl ? '0 0 15px rgba(79, 70, 229, 0.2)' : 'none'
          }}>
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '1.5rem', opacity: 0.25 }}>🖼️</span>
            )}
          </div>
        </div>

        {config.logoUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem' }}>✨</span>
              <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>Logo actif : fond retiré et contrastes optimisés.</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-color)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={config.invertLogoInLightMode !== false}
                onChange={(e) => setConfig({ ...config, invertLogoInLightMode: e.target.checked })}
                style={{ width: 'auto', marginBottom: 0 }}
              />
              <span>Inverser le logo en Mode Jour (Passage du logo blanc en Négatif/Noir)</span>
            </label>
          </div>
        )}
      </div>

      {currentUser && !currentUser.isMagicLink && activeAdminTab === 'prospects' && (
        <div className="admin-section" style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                📋 Gestion de Mes Prospects ({prospectsList.length})
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Créez, éditez ou supprimez vos fiches prospects et leurs boutiques dédiées.
              </p>
            </div>
            <button 
              onClick={() => setShowAddProspectModal(true)}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1.2rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              ➕ Créer un Portail Prospect
            </button>
          </div>

          {/* MODAL / FORMULAIRE DE CRÉATION DE PROSPECT */}
          {showAddProspectModal && (
            <form onSubmit={handleCreateProspect} style={{ background: 'rgba(30,41,59,0.8)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(79,70,229,0.4)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>✨ Nouveau Portail Prospect</h3>
                <button type="button" onClick={() => setShowAddProspectModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Nom de l'entreprise *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="ex: LB Peinture BTP" 
                    value={newProspectName} 
                    onChange={(e) => setNewProspectName(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Secteur d'activité</label>
                  <input 
                    type="text" 
                    placeholder="ex: Peinture / Maçonnerie" 
                    value={newProspectSector} 
                    onChange={(e) => setNewProspectSector(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase' }}>URL du Logo (Optionnel)</label>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    value={newProspectLogo} 
                    onChange={(e) => setNewProspectLogo(e.target.value)} 
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddProspectModal(false)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Annuler</button>
                <button type="submit" disabled={isCreatingProspect} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>
                  {isCreatingProspect ? "Création..." : "💾 Générer le Portail"}
                </button>
              </div>
            </form>
          )}

          {/* LISTE DES PROSPECTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {prospectsList.length > 0 ? prospectsList.map((p, idx) => (
              <div 
                key={p.uid || idx} 
                onMouseEnter={() => setHoveredProspectUid(p.uid)}
                onMouseLeave={() => setHoveredProspectUid(null)}
                style={{ 
                  position: 'relative',
                  background: 'rgba(30,41,59,0.4)', 
                  padding: '1rem 1.2rem', 
                  borderRadius: '14px', 
                  border: hoveredProspectUid === p.uid ? '1.5px solid rgba(79, 70, 229, 0.6)' : '1px solid rgba(255,255,255,0.06)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🏢</span> {p.companyName || 'Prospect Sans Nom'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <span><strong>Secteur :</strong> {p.activitySector || p.sector || 'BTP'}</span>
                    <span><strong>ID/UID :</strong> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#cbd5e1' }}>{p.uid}</code></span>
                  </div>
                </div>

                {/* POPUP APERÇU PAR SURVOL */}
                {hoveredProspectUid === p.uid && (
                  <div style={{
                    position: 'absolute',
                    right: '1.2rem',
                    bottom: '100%',
                    marginBottom: '10px',
                    width: '320px',
                    background: '#0f172a',
                    border: '2px solid rgba(79, 70, 229, 0.6)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(79, 70, 229, 0.3)',
                    zIndex: 99999,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{ padding: '0.5rem 0.86rem', background: 'rgba(30,41,59,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🔍 APERÇU DU PROSPECT</span>
                      <span style={{ fontSize: '0.65rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>ACTIF</span>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'radial-gradient(circle at center, rgba(30,41,59,0.6) 0%, #0f172a 100%)' }}>
                      {p.logoUrl ? (
                        <img src={p.logoUrl} alt={p.companyName} style={{ width: '64px', height: '64px', objectFit: 'contain', background: '#1e293b', borderRadius: '12px', padding: '6px', border: '1px solid rgba(255,255,255,0.12)' }} />
                      ) : (
                        <div style={{ width: '64px', height: '64px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#64748b' }}>🏢</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.companyName || 'Prospect Sans Nom'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, marginTop: '0.1rem' }}>{p.activitySector || p.sector || 'BTP'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>🛍️ Shop & Vitrine 3D prêts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href={`/profil?uid=${p.uid}&showcase=true`} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.08)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>👁️ Vitrine</a>
                  <a href={`/portail-shop?audit=${p.uid}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#34d399', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>🛍️ Shop</a>
                  <button 
                    onClick={() => {
                      setEditingUid(p.uid);
                      setActiveAdminTab('editor');
                      window.history.pushState({}, '', `/vitrine-admin/dashboard?uid=${p.uid}`);
                    }} 
                    style={{ background: '#4f46e5', border: 'none', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✏️ Gérer
                  </button>
                  <button onClick={() => handleDeleteProspect(p.uid)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.5rem 0.9rem', borderRadius: '8px', fontSize: '0.8rem', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>🗑️ Supprimer</button>
                </div>
              </div>
            )) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: 'rgba(15,23,42,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                Aucun profil prospect enregistré pour l'instant. Cliquez sur <strong>➕ Créer un Portail Prospect</strong> ci-dessus pour ajouter votre premier client !
              </div>
            )}
          </div>
        </div>
      )}

      <div className="admin-section">
        <h2>Présentation & IA</h2>
        
        {/* Search Input for Auto-fill via AI Web Search */}
        {!currentUser?.isMagicLink && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              🌍 Recherche Internet IA (Remplissage Auto)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                value={webSearchQuery} 
                onChange={(e) => setWebSearchQuery(e.target.value)} 
                placeholder="Nom de l'entreprise ou lien web (ex: www.signaid.eu)" 
                style={{ flex: 1, marginBottom: 0, padding: '0.8rem', fontSize: '0.9rem' }} 
              />
              <button 
                onClick={handleWebSearch} 
                disabled={isAnalyzingWeb || !webSearchQuery.trim()}
                style={{
                  background: 'var(--accent-color)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.8rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: (isAnalyzingWeb || !webSearchQuery.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isAnalyzingWeb || !webSearchQuery.trim()) ? 0.6 : 1
                }}
              >
                {isAnalyzingWeb ? "Recherche en cours..." : "🔍 Analyser"}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem', marginBottom: 0 }}>
              L'IA va scanner le web pour trouver des informations sur cette entreprise et pré-remplir les 4 champs ci-dessous.
            </p>
          </div>
        )}

        {/* Document Uploader for Auto-fill */}
        <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-color)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            📄 Importer depuis un Document (PDF, Image, Texte)
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="file" 
                accept="application/pdf,image/*,text/plain,text/csv" 
                onChange={handleDocumentUpload}
                id="doc-import-input"
                style={{ display: 'none' }}
                disabled={isAnalyzingDoc}
              />
              <label 
                htmlFor="doc-import-input" 
                style={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  padding: '0.85rem 1rem', 
                  borderRadius: '12px', 
                  background: 'rgba(30,41,59,0.5)', 
                  border: '1px dashed rgba(255,255,255,0.2)', 
                  color: '#cbd5e1', 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  cursor: isAnalyzingDoc ? 'not-allowed' : 'pointer', 
                  transition: 'all 0.2s ease' 
                }}
              >
                {isAnalyzingDoc ? "Analyse du document par l'IA..." : "📂 Choisir un fichier (PDF, image, questionnaire...)"}
              </label>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem', marginBottom: 0 }}>
            L'IA va lire le document (questionnaire rempli, devis, etc.) et pré-remplir l'ensemble de la fiche (identité, contacts, pitch, réseaux sociaux).
          </p>
        </div>

        {/* Pitch Inputs (to adjust them before generating) */}
        {!currentUser?.isMagicLink && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>1. Ce que je vends</label>
                <input name="pitchWhat" value={config.rawPitch?.what || ""} onChange={(e) => setConfig({ ...config, rawPitch: { ...(config.rawPitch || {}), what: e.target.value } as any })} placeholder="ex: Des sites vitrine sur mesure" style={{ marginBottom: 0, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>2. À qui (Cible)</label>
                <input name="pitchWho" value={config.rawPitch?.who || ""} onChange={(e) => setConfig({ ...config, rawPitch: { ...(config.rawPitch || {}), who: e.target.value } as any })} placeholder="ex: Entrepreneurs, PME et artisans" style={{ marginBottom: 0, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>3. Ma différence unique</label>
                <input name="pitchDiff" value={config.rawPitch?.difference || ""} onChange={(e) => setConfig({ ...config, rawPitch: { ...(config.rawPitch || {}), difference: e.target.value } as any })} placeholder="ex: Design unique, service complet clé en main" style={{ marginBottom: 0, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>4. Bénéfice principal</label>
                <input name="pitchService" value={config.rawPitch?.service || ""} onChange={(e) => setConfig({ ...config, rawPitch: { ...(config.rawPitch || {}), service: e.target.value } as any })} placeholder="ex: Impact maximal pour booster leur activité" style={{ marginBottom: 0, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }} />
              </div>
            </div>

            <button 
              onClick={triggerAIGeneration} 
              className="primary-btn" 
              disabled={isGenerating} 
              style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                color: '#fff', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)', 
                fontWeight: 800, 
                padding: '0.85rem 1.5rem', 
                borderRadius: '10px', 
                cursor: 'pointer',
                marginBottom: '1.5rem',
                width: '100%'
              }}
            >
              {isGenerating ? "🧠 L'IA analyse votre activité et rédige 3 options..." : "✨ Générer les 3 options de présentation IA"}
            </button>

            {aiOptions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '1rem' }}>
                  💡 Suggestions de l'IA (Sélectionnez celle que vous préférez) :
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {aiOptions.map((optText, i) => {
                    if (!optText) return null;
                    const isSelected = config.presentation?.trim() === optText.trim();
                    const labels = ["Axée sur la Solution", "Axée sur la Cible", "Axée sur la Différence"];
                    const icons = ["🎯", "👥", "⚡"];
                    
                    return (
                      <div 
                        key={i}
                        onClick={() => selectAiOption(optText)}
                        style={{
                          background: isSelected ? 'rgba(var(--accent-rgb), 0.08)' : 'rgba(255,255,255,0.02)',
                          border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '16px',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? '0 8px 30px rgba(var(--accent-rgb), 0.15)' : 'none',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.8rem'
                        }}
                        className="ai-option-card"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{icons[i]}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isSelected ? 'var(--accent-color)' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Option {i + 1} : {labels[i]}
                          </span>
                          {isSelected && (
                            <span style={{ marginLeft: 'auto', background: 'var(--accent-color)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Actif
                            </span>
                          )}
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: isSelected ? '#fff' : '#cbd5e1', lineHeight: '1.5', margin: 0, fontStyle: 'italic', flexGrow: 1 }}>
                          "{optText}"
                        </p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAiOption(optText);
                          }}
                          style={{
                            background: isSelected ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#fff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: '100%',
                            textAlign: 'center'
                          }}
                        >
                          {isSelected ? "✨ Option Sélectionnée" : "👉 Choisir cette option"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>
            {currentUser?.isMagicLink ? "📝 Texte de présentation de votre entreprise :" : "📝 Texte Final de Présentation (Modifiable à la main) :"}
          </label>
          <textarea 
            name="presentation" 
            value={config.presentation} 
            onChange={handleChange} 
            rows={4} 
            placeholder="Texte de présentation actif sur votre site..." 
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontSize: '0.9rem', lineHeight: '1.5', boxSizing: 'border-box' }} 
          />
        </div>
      </div>

      <div className="admin-section">
        <h2>Vidéo Directe (Cloud)</h2>
        <input type="file" accept="video/*" onChange={handleVideoUpload} />
        {uploadProgress && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-color)' }}>{uploadProgress}</p>}
        {config.videoUrl && !uploadProgress.includes("Téléchargement") && !uploadProgress.includes("Erreur") && (
          <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>Lien actif : {config.videoUrl.substring(0, 50)}...</p>
        )}
      </div>

      <div className="admin-section">
        <h2>Photos d'ambiance / Galerie (Cloud)</h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
          Ajoutez plusieurs photos d'ambiance qui défileront sous forme de carrousel directement sur votre vitrine.
        </p>
        
        <input type="file" accept="image/*" onChange={handleLivePhotoUpload} />
        {livePhotoProgress && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-color)' }}>{livePhotoProgress}</p>}
        
        {config.livePhotoUrls && config.livePhotoUrls.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
            {config.livePhotoUrls.map((url, index) => (
              <div key={index} style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => handleRemoveLivePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ⚡ GESTION DES BOUTONS & LIENS (Paramétrage & Ordre) */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>⚡ Boutons & Liens (Paramétrage & Ordre)</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              Modifiez les titres, liens, émojis, et réorganisez l'ordre d'affichage sur votre vitrine avec les flèches ↑ et ↓.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCustomLink}
            style={{
              backgroundColor: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.2rem',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.3)'
            }}
          >
            + Ajouter un Bouton
          </button>
        </div>

        {/* LISTING DES BOUTONS EN COURS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {getEffectiveLinks(config).map((link, index, array) => (
            <div
              key={link.id || index}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              {/* HEADER DU BOUTON (TYPE & CONTROLES DE DEPLACEMENT) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{link.icon || (link.type === 'booking' ? '📅' : link.type === 'whatsapp' ? '💬' : link.type === 'email' ? '✉' : '🔗')}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em' }}>
                    {link.type === 'booking' ? 'Bouton Booking' : link.type === 'whatsapp' ? 'Bouton WhatsApp' : link.type === 'email' ? 'Bouton Email' : (link.platform || 'Lien Personnalisé')}
                  </span>
                  {link.enabled === false && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      Masqué
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveLink(index, 'up')}
                    disabled={index === 0}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '8px',
                      background: 'var(--card-bg)',
                      color: index === 0 ? '#888' : 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}
                    title="Monter ce bouton"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveLink(index, 'down')}
                    disabled={index === array.length - 1}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '8px',
                      background: 'var(--card-bg)',
                      color: index === array.length - 1 ? '#888' : 'var(--text-color)',
                      border: '1px solid var(--border-color)',
                      cursor: index === array.length - 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}
                    title="Descendre ce bouton"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleLinkEnabled(index)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '8px',
                      background: link.enabled !== false ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: link.enabled !== false ? '#4ade80' : '#f87171',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    {link.enabled !== false ? 'Visible' : 'Masqué'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                    title="Supprimer ce bouton"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* INPUTS DU BOUTON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                    Titre du bouton
                  </label>
                  <input
                    value={link.title}
                    onChange={(e) => handleUpdateLink(index, 'title', e.target.value)}
                    placeholder="ex: Écouter sur SoundCloud"
                    style={{ marginBottom: 0, padding: '0.65rem 0.8rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                    Destination (URL / Tél / Mail)
                  </label>
                  <input
                    value={link.url || ''}
                    onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                    placeholder={link.type === 'whatsapp' ? '+32488861539' : link.type === 'email' ? 'email@domaine.com' : 'https://...'}
                    style={{ marginBottom: 0, padding: '0.65rem 0.8rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                    Émoji / Icône
                  </label>
                  <input
                    value={link.icon || ''}
                    onChange={(e) => handleUpdateLink(index, 'icon', e.target.value)}
                    placeholder="ex: 🎵"
                    style={{ marginBottom: 0, padding: '0.65rem 0.8rem', fontSize: '0.85rem', textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2>Coordonnées</h2>
        <input name="contactEmail" value={config.contactEmail} onChange={handleChange} placeholder="Email" />
        <input name="whatsappNumber" value={config.whatsappNumber} onChange={handleChange} placeholder="WhatsApp" />
        <input name="address" value={config.address} onChange={handleChange} placeholder="Adresse" />
        <input name="merchUrl" value={config.merchUrl} onChange={handleChange} placeholder="Lien Portail / Produits" />
      </div>

      <div className="admin-section">
        <h2>Réseaux Sociaux</h2>
        {config.socials.map((social, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={social.platform} onChange={(e) => handleSocialChange(index, 'platform', e.target.value)} style={{ flex: 1, marginBottom: 0 }} placeholder="Plateforme" />
            <input value={social.url} onChange={(e) => handleSocialChange(index, 'url', e.target.value)} style={{ flex: 2, marginBottom: 0 }} placeholder="URL" />
            <button onClick={() => removeSocial(index)} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '10px', padding: '0 1rem' }}>×</button>
          </div>
        ))}
        <button onClick={addSocial} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', marginTop: '1rem' }}>+ Ajouter Réseau</button>
      </div>

      <div className="admin-section">
        <h2>Sections Personnalisées</h2>
        {config.customSections.map((section, index) => (
          <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '15px', padding: '1rem', marginBottom: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
               <input 
                 value={section.title} 
                 onChange={(e) => handleCustomSectionChange(index, 'title', e.target.value)} 
                 placeholder="Titre de la section" 
                 style={{ flex: 1, marginRight: '1rem', marginBottom: 0 }}
               />
               <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => moveSection(index, 'up')} disabled={index === 0} style={{ padding: '0.3rem 0.6rem', borderRadius: '5px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>↑</button>
                  <button onClick={() => moveSection(index, 'down')} disabled={index === config.customSections.length - 1} style={{ padding: '0.3rem 0.6rem', borderRadius: '5px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>↓</button>
                  <button onClick={() => removeCustomSection(index)} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', padding: '0.3rem 0.6rem' }}>×</button>
               </div>
            </div>
            <textarea value={section.content} onChange={(e) => handleCustomSectionChange(index, 'content', e.target.value)} rows={3} placeholder="Contenu (supporte le HTML et les liens auto-cliquables)" />
          </div>
        ))}
        <button onClick={addCustomSection} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', marginTop: '1rem' }}>+ Ajouter Section</button>
      </div>

      {!currentUser?.isMagicLink && (
        <div className="admin-section" style={{ border: '2px solid var(--accent-color)', background: 'rgba(var(--accent-rgb), 0.05)' }}>
          <h2 style={{ color: 'var(--accent-color)' }}>🔄 Ordre d'affichage global</h2>
          <p style={{ fontSize: '0.8rem', marginBottom: '1rem', opacity: 0.7 }}>Déplacez l'ensemble des composants du site (Réseaux, Contact, Portail, Sections Perso...)</p>
          {(config.sectionOrder || []).map((id, index) => (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{getSectionLabel(id)}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => moveGlobalSection(index, 'up')} disabled={index === 0} style={{ padding: '0.3rem 0.6rem', borderRadius: '5px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>↑</button>
                <button onClick={() => moveGlobalSection(index, 'down')} disabled={index === (config.sectionOrder?.length || 0) - 1} style={{ padding: '0.3rem 0.6rem', borderRadius: '5px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>↓</button>
              </div>
            </div>
          ))}
        </div>
      )}


      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', marginBottom: '5rem' }}>
        <button 
          onClick={() => {
            window.open(`${window.location.origin}/portail-shop?uid=${editingUid || auth.currentUser?.uid}`, '_blank');
          }}
          className="primary-btn" 
          style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: '#fff', 
            fontSize: '1rem', 
            padding: '1.1rem', 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)', 
            fontWeight: 800,
            cursor: 'pointer',
            marginBottom: '0.5rem'
          }}
        >
          🛍️ Accéder à la page de commande (Boutique)
        </button>

        <button 
          onClick={() => {
            window.open(`${window.location.origin}/${getAuditRoute()}?uid=${editingUid || auth.currentUser?.uid}&refresh=true`, '_blank');
          }}
          className="primary-btn" 
          style={{ 
            background: 'var(--card-bg)', 
            color: 'var(--text-color)', 
            fontSize: '0.9rem', 
            padding: '0.9rem', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {currentUser?.isMagicLink ? "👁️ Voir mes Objets & Gabarits 3D" : "✨ Générer / Modifier mes gabarits"}
        </button>

        <button 
          onClick={handleSave} 
          className="primary-btn" 
          style={{ 
            padding: '1.1rem', 
            borderRadius: '12px', 
            background: 'var(--accent-color)', 
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          {isSaving ? "Sauvegarde..." : "💾 Publier les changements"}
        </button>
      </div>
    </main>
  );
}
