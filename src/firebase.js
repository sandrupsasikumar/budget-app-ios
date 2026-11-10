import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

// Phone (Expo Go): sign in is remembered in AsyncStorage. Firestore's offline cache only lasts
// while the app is open here, but the app's own copy on the phone covers that.
let services = null;
export function firebase() {
  if (!firebaseConfigured) return null;
  if (!services) {
    const app = initializeApp(firebaseConfig);
    services = {
      auth: initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }),
      db: getFirestore(app),
    };
  }
  return services;
}
