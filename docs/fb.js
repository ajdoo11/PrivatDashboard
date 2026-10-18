// Firebase-Anbindung: Auth (E-Mail/Passwort) + Firestore mit Offline-Cache.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  sendEmailVerification, reload, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, clearIndexedDbPersistence,
  collection, doc, onSnapshot, writeBatch, getDoc, setDoc, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// Öffentliche Web-Konfiguration (kein Geheimnis – geschützt wird über Login + Firestore-Regeln)
const cfg = {
  apiKey: 'AIzaSyAIhFwr_k45RlYQeTV-Ban1KeWBGu8GaKE',
  authDomain: 'mein-pdf-plan-manager.firebaseapp.com',
  projectId: 'mein-pdf-plan-manager',
  storageBucket: 'mein-pdf-plan-manager.firebasestorage.app',
  messagingSenderId: '887230417501',
  appId: '1:887230417501:web:f29b3f1a9b918fa8865bb4',
};

if (!cfg) {
  window.FB = {error: 'Firebase-Konfiguration nicht gefunden. Die App muss über Firebase Hosting geöffnet werden.'};
} else {
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
