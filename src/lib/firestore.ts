import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, writeBatch, getDoc } from 'firebase/firestore';
import type { Website, WebsiteFormData } from './types';

const websitesCollection = collection(db, 'websites');

export async function getWebsites(): Promise<Website[]> {
    const q = query(websitesCollection, orderBy('displayOrder'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Website));
}

export async function addWebsite(website: Website): Promise<void> {
    const docRef = doc(websitesCollection, website.id);
    await setDoc(docRef, website);
}

export async function updateWebsite(id: string, data: Partial<Website>): Promise<void> {
    const docRef = doc(websitesCollection, id);
    await setDoc(docRef, data, { merge: true });
}

export async function deleteWebsiteFS(id: string): Promise<void> {
    const docRef = doc(websitesCollection, id);
    await deleteDoc(docRef);
}

export async function seedInitialData(initialWebsites: Omit<Website, 'id'>[]) {
    const querySnapshot = await getDocs(websitesCollection);
    if (querySnapshot.empty) {
        const batch = writeBatch(db);
        initialWebsites.forEach((siteData, index) => {
            const id = `${Date.now()}-${index}`;
            const newSite: Website = {
                ...siteData,
                id,
                latencyHistory: [],
                statusHistory: [],
                uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
            };
            const docRef = doc(db, "websites", id);
            batch.set(docRef, newSite);
        });
        await batch.commit();
        console.log("Initial data seeded to Firestore.");
    }
}
