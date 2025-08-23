// src/lib/firestore.ts
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import type { Website } from './types';

type WebsiteFormData = Omit<Website, 'id' | 'createdAt' | 'status' | 'latencyHistory' | 'statusHistory' | 'uptimeData' | 'isLoading'>;

const websitesCollection = collection(db, 'websites');

// Get all websites in real-time
// A snapshot listener will be used in the component for real-time updates

// Add a new website
export const addWebsite = async (websiteData: WebsiteFormData) => {
  const newWebsite: Omit<Website, 'id'> = {
    ...websiteData,
    status: 'Idle',
    latencyHistory: [],
    statusHistory: [],
    uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
    createdAt: serverTimestamp(),
    isPaused: false,
  };
  return await addDoc(websitesCollection, newWebsite);
};

// Update a website
export const updateWebsite = async (id: string, updates: Partial<Website>) => {
  const websiteDoc = doc(db, 'websites', id);
  return await updateDoc(websiteDoc, { ...updates, updatedAt: serverTimestamp() });
};

// Delete a website
export const deleteWebsite = async (id: string) => {
  const websiteDoc = doc(db, 'websites', id);
  return await deleteDoc(websiteDoc);
};

// Move website order
export const moveWebsite = async (id: string, allWebsites: Website[], direction: 'up' | 'down') => {
  const sites = [...allWebsites].sort((a,b) => (a.createdAt as any)?.seconds - (b.createdAt as any)?.seconds);
  const index = sites.findIndex(site => site.id === id);

  if (index === -1) return;

  const newIndex = direction === 'up' ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= sites.length) return;

  const batch = writeBatch(db);
  const item = sites[index];
  const otherItem = sites[newIndex];

  // Swap createdAt timestamps
  const itemRef = doc(db, 'websites', item.id);
  batch.update(itemRef, { createdAt: otherItem.createdAt });
  
  const otherItemRef = doc(db, 'websites', otherItem.id);
  batch.update(otherItemRef, { createdAt: item.createdAt });

  await batch.commit();
}


// Seed initial data if the collection is empty
export const seedInitialData = async (initialWebsites: Omit<Website, 'id'>[]) => {
    const q = query(websitesCollection);
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        console.log("Database is empty, seeding initial data...");
        const batch = writeBatch(db);
        initialWebsites.forEach(site => {
            const docRef = doc(websitesCollection); // Automatically generate unique ID
            batch.set(docRef, { ...site, createdAt: serverTimestamp() });
        });
        await batch.commit();
        console.log("Initial data seeded.");
    }
}
