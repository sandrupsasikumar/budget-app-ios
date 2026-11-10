import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

// Browser: sign in is remembered in IndexedDB, and Firestore keeps an offline copy there too,
// so the home screen app opens and records expenses with no signal.
let services = null;
export function firebase() {
  if (!firebaseConfigured) return null;
  if (!services) {
    const app = initializeApp(firebaseConfig);
    services = {
      auth: getAuth(app),
      db: initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }),
    };
  }
  return services;
}
