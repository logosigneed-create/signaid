import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStoredConfig, SiteConfig } from '../lib/store';
import { Paywall } from './Paywall';

export const RequirePremium = ({ children }: { children: React.ReactNode }) => {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (typeof window !== 'undefined' && window.location.pathname.includes('/vitrine-admin')) {
        setIsPremium(true);
        setLoading(false);
        return;
      }

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const targetUid = urlParams?.get("uid");
      const urlKey = urlParams?.get("key");

      if (targetUid) {
        try {
          const config: SiteConfig = await getStoredConfig(targetUid);
          const expectedKey = config.actuationKey || config.generatedKey;
          // Valid Magic Link key OR isPremium === true OR isGuest === true
          if ((urlKey && expectedKey && expectedKey.trim() === urlKey.trim()) || config.isPremium === true || config.isGuest === true) {
            setIsPremium(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Magic link check in RequirePremium:", e);
        }
      }

      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const config: SiteConfig = await getStoredConfig(user.uid);
            // Master Admin or user with isPremium / isGuest has access
            if (user.email === 'logosigneed@gmail.com' || config.isPremium === true || config.isGuest === true) {
              setIsPremium(true);
            } else {
              setIsPremium(false);
            }
          } catch (e) {
            setIsPremium(user.email === 'logosigneed@gmail.com');
          }
        } else {
          // If accessing vitrine-admin dashboard, allow rendering so the email/password login form is shown
          if (typeof window !== 'undefined' && window.location.pathname.includes('/vitrine-admin')) {
            setIsPremium(true);
          } else {
            setIsPremium(false);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>
        Chargement...
      </div>
    );
  }

  if (!isPremium) {
    return <Paywall />;
  }

  return <>{children}</>;
};
