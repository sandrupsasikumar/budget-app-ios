import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { isWeb } from './platform';

// ---- Web: photos live in IndexedDB as small JPEG data URLs (localStorage is too small) ----

const DB = 'budget-receipts';
const STORE = 'photos';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req && req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function shrink(uri, maxSide = 1280, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = uri;
  });
}

// ---- Shared API ----

// Returns a stored reference for the photo, or null if cancelled.
export async function pickReceipt(source, id) {
  let res;
  if (source === 'camera') {
    if (!isWeb) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error('Camera permission was not granted.');
    }
    res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.5 });
  } else {
    res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.5 });
  }
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;
  if (isWeb) {
    const dataUrl = await shrink(uri);
    const key = `${id}-${Date.now()}`;
    await idb('readwrite', (s) => s.put(dataUrl, key));
    return `idb:${key}`;
  }
  // Copy out of the picker's cache so the phone cannot clear it later.
  const dir = new Directory(Paths.document, 'receipts');
  dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, `${id}-${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deleteReceipt(ref) {
  if (!ref) return;
  if (isWeb) {
    if (ref.startsWith('idb:')) idb('readwrite', (s) => s.delete(ref.slice(4))).catch(() => {});
    return;
  }
  try {
    const f = new File(ref);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

// Turns a stored reference into something an <Image> can show.
export function useReceiptUri(ref) {
  const inDb = !!ref && ref.startsWith('idb:');
  const [loaded, setLoaded] = useState({ ref: null, uri: null });
  useEffect(() => {
    if (!inDb) return undefined;
    let live = true;
    idb('readonly', (s) => s.get(ref.slice(4)))
      .then((v) => { if (live) setLoaded({ ref, uri: v || null }); })
      .catch(() => { if (live) setLoaded({ ref, uri: null }); });
    return () => { live = false; };
  }, [ref, inDb]);
  if (!ref) return null;
  if (!inDb) return ref;
  return loaded.ref === ref ? loaded.uri : null;
}
