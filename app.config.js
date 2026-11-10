// BASE_URL lets the web build live in a sub folder, e.g. GitHub Pages at /budget-app.
// Firebase settings come from EXPO_PUBLIC_FIREBASE_* environment variables (see src/firebaseConfig.js).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), baseUrl: process.env.BASE_URL || '' },
});
