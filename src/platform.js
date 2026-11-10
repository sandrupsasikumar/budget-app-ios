import { Platform, Alert } from 'react-native';

export const isWeb = Platform.OS === 'web';

export function say(title, msg) {
  if (isWeb && typeof window !== 'undefined') window.alert(msg ? `${title}\n\n${msg}` : title);
  else Alert.alert(title, msg);
}

// Calls onYes after the person confirms. Uses the browser's confirm box on web.
export function confirmAction(title, msg, yesLabel, onYes) {
  if (isWeb && typeof window !== 'undefined') {
    if (window.confirm(msg ? `${title}\n\n${msg}` : title)) onYes();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}

export function isIos() {
  if (!isWeb || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function isInstalledWebApp() {
  if (!isWeb || typeof window === 'undefined') return false;
  return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

// Ask the browser not to clear our storage when space runs low.
export async function requestPersistentStorage() {
  try {
    if (isWeb && navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // not supported
  }
  return false;
}
