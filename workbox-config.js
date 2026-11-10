// Precaches the exported web app so it opens offline once installed.
module.exports = {
  globDirectory: 'dist/',
  // Expo puts icon fonts under assets/node_modules, which Workbox skips by default.
  globPatterns: ['**/*.{js,html,ico,json,png,css}', 'assets/**/Ionicons*.ttf'],
  globIgnores: ['**/*.map', 'sw.js', 'workbox-*.js', '404.html'],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  navigateFallback: 'index.html',
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
};
