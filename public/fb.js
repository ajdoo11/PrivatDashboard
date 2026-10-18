// Firebase-Anbindung: Auth (E-Mail/Passwort) + Firestore mit Offline-Cache.
// Die Konfiguration liefert Firebase Hosting automatisch unter /__/firebase/init.json.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  sendEmailVerification, reload, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, clearIndexedDbPersistence,
  collection, doc, onSnapshot, writeBatch, getDoc, setDoc, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

let cfg = null;
try { const r = await fetch('/__/firebase/init.json', {cache: 'no-store'}); if (r.ok) cfg = await r.json(); } catch (e) { /* offline */ }
if (!cfg) { try { cfg = JSON.parse(localStorage.getItem('zuhause.fbcfg')); } catch (e) { cfg = null; } }

if (!cfg) {
  window.FB = {error: 'Firebase-Konfiguration nicht gefunden. Die App muss über Firebase Hosting geöffnet werden.'};
} else {
  try { localStorage.setItem('zuhause.fbcfg', JSON.stringify(cfg)); } catch (e) {}
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  const db = initializeFirestore(app, {localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})});
  window.FB = {
    auth, db,
    fns: {onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification, reload,
      collection, doc, onSnapshot, writeBatch, getDoc, setDoc, deleteDoc, terminate, clearIndexedDbPersistence},
  };
}
window.dispatchEvent(new Event('fb-ready'));
