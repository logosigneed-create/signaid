/**
 * indexedDbStorage.ts
 * Stockage persistant haute capacité (IndexedDB) pour Droppaid / Signaid.
 * Fournit une couche de secours robuste avec quota étendu (50 Mo - 1 Go+)
 * évitant QuotaExceededError du LocalStorage et résistant aux erreurs 502 / quotas / hors-ligne.
 */

const DB_NAME = 'droppaid_offline_store';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_APP_STATE = 'app_state';

const KEY_LATEST_ACTIVE = 'latest_active_project';

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

let dbInstancePromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_APP_STATE)) {
          db.createObjectStore(STORE_APP_STATE, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (err) => {
        console.warn('[IndexedDB] Erreur ouverture base hors-ligne:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[IndexedDB] Exception accès IndexedDB:', e);
      resolve(null);
    }
  });

  return dbInstancePromise;
}

/**
 * Sauvegarde un projet complet dans IndexedDB (haute capacité sans limite 5Mo).
 * Met à jour à la fois le store de projets et l'état du projet actif courant.
 */
export async function saveProjectToIndexedDB(project: any): Promise<boolean> {
  if (!project || typeof project !== 'object') return false;
  const db = await getDb();
  if (!db) return false;

  const projectId = project.id || project.projectId || project.slug || 'draft_active';
  const now = Date.now();
  const projectRecord = {
    ...project,
    id: projectId,
    projectId,
    updatedAtMillis: project.updatedAtMillis || now,
    lastSavedLocally: now,
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_PROJECTS, STORE_APP_STATE], 'readwrite');
      const projectsStore = tx.objectStore(STORE_PROJECTS);
      const stateStore = tx.objectStore(STORE_APP_STATE);

      projectsStore.put(projectRecord);
      stateStore.put({
        key: KEY_LATEST_ACTIVE,
        project: projectRecord,
        updatedAt: now,
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Récupère le dernier projet actif depuis IndexedDB
 */
export async function getLatestProjectFromIndexedDB(): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_APP_STATE, STORE_PROJECTS], 'readonly');
      const stateStore = tx.objectStore(STORE_APP_STATE);
      const stateReq = stateStore.get(KEY_LATEST_ACTIVE);

      stateReq.onsuccess = () => {
        if (stateReq.result && stateReq.result.project) {
          resolve(stateReq.result.project);
          return;
        }

        // Si la clé d'état actif n'est pas renseignée, chercher le plus récent dans 'projects'
        const projectsStore = tx.objectStore(STORE_PROJECTS);
        const allReq = projectsStore.getAll();
        allReq.onsuccess = () => {
          const list: any[] = allReq.result || [];
          if (list.length === 0) {
            resolve(null);
            return;
          }
          list.sort((a, b) => (b.updatedAtMillis || b.lastSavedLocally || 0) - (a.updatedAtMillis || a.lastSavedLocally || 0));
          resolve(list[0]);
        };
        allReq.onerror = () => resolve(null);
      };

      stateReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Récupère un projet spécifique par son identifiant
 */
export async function getProjectFromIndexedDB(id: string): Promise<any | null> {
  if (!id) return null;
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Liste l'intégralité des projets stockés localement dans IndexedDB (triés du plus récent au plus ancien)
 */
export async function getAllProjectsFromIndexedDB(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const list: any[] = req.result || [];
        list.sort((a, b) => (b.updatedAtMillis || b.lastSavedLocally || 0) - (a.updatedAtMillis || a.lastSavedLocally || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Supprime un projet d'IndexedDB
 */
export async function deleteProjectFromIndexedDB(id: string): Promise<boolean> {
  if (!id) return false;
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_PROJECTS, STORE_APP_STATE], 'readwrite');
      const projectsStore = tx.objectStore(STORE_PROJECTS);
      const stateStore = tx.objectStore(STORE_APP_STATE);

      projectsStore.delete(id);

      // Si le projet supprimé était l'actif, nettoyer
      const stateReq = stateStore.get(KEY_LATEST_ACTIVE);
      stateReq.onsuccess = () => {
        if (stateReq.result && stateReq.result.project && (stateReq.result.project.id === id || stateReq.result.project.projectId === id)) {
          stateStore.delete(KEY_LATEST_ACTIVE);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
