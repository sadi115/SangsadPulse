// src/lib/firebase.ts
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "webwatch-lk3pq",
  appId: "1:413559361901:web:33255988edb8691fc44a64",
  storageBucket: "webwatch-lk3pq.firebasestorage.app",
  apiKey: "AIzaSyAFJ512cyyMxaFhTrjgmGbjCPYMGTK5Vyw",
  authDomain: "webwatch-lk3pq.firebaseapp.com",
  messagingSenderId: "413559361901",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// If you want to use the local emulator, uncomment the line below
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }


export { app, db };
