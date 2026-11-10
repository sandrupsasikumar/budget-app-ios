import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import { doc, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import { firebase } from './firebase';
import { firebaseConfigured } from './firebaseConfig';

// Sign in and Firestore sync, using the Firebase JS SDK so it works in Safari and Expo Go.
export const cloudAvailable = firebaseConfigured;

const toUser = (u) => (u ? { uid: u.uid, email: u.email || null } : null);

export function watchAuth(cb) {
  const fb = firebase();
  if (!fb) { cb(null); return () => {}; }
  return onAuthStateChanged(fb.auth, (u) => cb(toUser(u)));
}

// Plain English versions of Firebase's error codes.
const MESSAGES = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/email-already-in-use': 'There is already an account with that email. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No internet connection. Signing in needs a connection the first time.',
  'auth/operation-not-allowed': 'Email sign in is not switched on in the Firebase console yet.',
};
export function authMessage(e) {
  const code = (e && e.code) || '';
  if (code.startsWith('auth/api-key-not-valid')) return 'The Firebase settings in this build are wrong. Check the EXPO_PUBLIC_FIREBASE_* values.';
  return MESSAGES[code] || String((e && e.message) || e);
}

export async function signInEmail(email, password) {
  await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
}

export async function createAccount(email, password) {
  await createUserWithEmailAndPassword(firebase().auth, email.trim(), password);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(firebase().auth, email.trim());
}

export async function signOutCloud() {
  await signOut(firebase().auth);
}

// Live updates for one person's data. The offline cache answers first,
// then the server version follows when there is signal.
export function watchUserData(uid, { onMeta, onTx, onError }) {
  const { db } = firebase();
  const cached = (s) => !!(s.metadata && s.metadata.fromCache);
  // Metadata changes too, so we hear when the server confirms data the cache already had.
  const opts = { includeMetadataChanges: true };
  const stopMeta = onSnapshot(doc(db, 'users', uid), opts, (s) => onMeta(s.exists() ? s.data() : null, cached(s)), onError);
  const stopTx = onSnapshot(collection(db, 'users', uid, 'transactions'), opts, (q) => {
    const tx = {};
    q.forEach((d) => { tx[d.id] = { ...d.data(), id: d.id }; });
    onTx(tx, cached(q));
  }, onError);
  return () => { stopMeta(); stopTx(); };
}

// Firestore allows 500 writes per batch.
const BATCH = 450;

// Writes go into the local cache at once and upload when online.
export async function writeChanges(uid, { meta, upserts, deletes }) {
  const { db } = firebase();
  const ops = [];
  if (meta) ops.push((b) => b.set(doc(db, 'users', uid), meta));
  for (const t of upserts) ops.push((b) => b.set(doc(db, 'users', uid, 'transactions', t.id), t));
  for (const id of deletes) ops.push((b) => b.delete(doc(db, 'users', uid, 'transactions', id)));
  const commits = [];
  for (let i = 0; i < ops.length; i += BATCH) {
    const b = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH)) op(b);
    commits.push(b.commit());
  }
  await Promise.all(commits);
}
