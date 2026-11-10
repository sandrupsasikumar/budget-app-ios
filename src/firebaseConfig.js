// Firebase web app settings, read from EXPO_PUBLIC_FIREBASE_* environment variables at build time
// (a .env.local file locally, repository variables in GitHub Actions). These values are not secret:
// the Firestore security rules are what keep the data private.
// Each one is written out in full because Expo only inlines process.env.EXPO_PUBLIC_* when accessed directly.
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Without the settings the app runs in "this device only" mode.
export const firebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
