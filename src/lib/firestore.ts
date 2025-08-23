
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
  Timestamp,
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
  const updateData: Record<string, any> = { ...updates };

  // Convert ISO string dates back to Timestamps if they exist
  if (updates.lastChecked) {
    updateData.lastChecked = Timestamp.fromDate(new Date(updates.lastChecked));
  }
  if (updates.lastDownTime) {
    updateData.lastDownTime = Timestamp.fromDate(new Date(updates.lastDownTime));
  }

  return await updateDoc(websiteDoc, { ...updateData, updatedAt: serverTimestamp() });
};

// Delete a website
export const deleteWebsite = async (id: string) => {
  const websiteDoc = doc(db, 'websites', id);
  return await deleteDoc(websiteDoc);
};

// Move website order
export const moveWebsite = async (id: string, allWebsites: Website[], direction: 'up' | 'down') => {
  const sites = [...allWebsites].sort((a,b) => {
      const timeA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return timeA - timeB;
  });
  const index = sites.findIndex(site => site.id === id);

  if (index === -1) return;

  const newIndex = direction === 'up' ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= sites.length) return;

  const batch = writeBatch(db);
  const item = sites[index];
  const otherItem = sites[newIndex];
  
  if (!item.createdAt || !otherItem.createdAt) {
      console.error("Cannot move items without a createdAt timestamp.");
      return;
  }

  // Swap createdAt timestamps
  const itemRef = doc(db, 'websites', item.id);
  batch.update(itemRef, { createdAt: Timestamp.fromDate(new Date(otherItem.createdAt as string)) });
  
  const otherItemRef = doc(db, 'websites', otherItem.id);
  batch.update(otherItemRef, { createdAt: Timestamp.fromDate(new Date(item.createdAt as string)) });

  await batch.commit();
}


// Seed initial data if the collection is empty
export const seedInitialData = async (initialWebsites: Omit<Website, 'id'>[]) => {
    try {
        const q = query(websitesCollection);
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("Database is empty, seeding initial data...");
            const batch = writeBatch(db);
            initialWebsites.forEach(site => {
                const docRef = doc(websitesCollection); // Automatically generate unique ID
                batch.set(docRef, { ...site, createdAt: serverTimestamp(), isPaused: false });
            });
            await batch.commit();
            console.log("Initial data seeded.");
        }
    } catch (error) {
        console.error("Error seeding data:", error);
    }
}

    