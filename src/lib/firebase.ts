import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "webwatch-lk3pq",
  appId: "1:413559361901:web:33255988edb8691fc44a64",
  storageBucket: "webwatch-lk3pq.firebasestorage.app",
  apiKey: "AIzaSyAFJ512cyyMxaFhTrjgmGbjCPYMGTK5Vyw",
  authDomain: "webwatch-lk3pq.firebaseapp.com",
  messagingSenderId: "413559361901",
  measurementId: "G-XXXXXXXXXX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
