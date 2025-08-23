
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, orderBy, query, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import type { Website, WebsiteFormData } from './types';

const websitesCollection = collection(db, 'websites');

// Helper function to remove undefined properties from an object
function removeUndefinedProps(obj: Record<string, any>) {
    const newObj: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
}

export async function getWebsites(): Promise<Website[]> {
    const q = query(websitesCollection, orderBy('displayOrder'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Website));
}

export async function addWebsite(website: Website): Promise<void> {
    const docRef = doc(websitesCollection, website.id);
    const cleanedWebsite = removeUndefinedProps(website);
    await setDoc(docRef, cleanedWebsite);
}

export async function updateWebsite(id: string, data: Partial<Website>): Promise<void> {
    const docRef = doc(websitesCollection, id);
    const cleanedData = removeUndefinedProps(data);
    await setDoc(docRef, cleanedData, { merge: true });
}

export async function deleteWebsiteFS(id: string): Promise<void> {
    const docRef = doc(websitesCollection, id);
    await deleteDoc(docRef);
}

export async function seedInitialData(initialWebsites: Omit<Website, 'id' | 'statusHistory' | 'latencyHistory' | 'uptimeData'>[]) {
    const batch = writeBatch(db);
    initialWebsites.forEach((siteData, index) => {
        const id = `${Date.now()}-${index}`;
        const newSite: Website = {
            ...siteData,
            id,
            statusHistory: [],
            latencyHistory: [],
            uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
        };
        const docRef = doc(db, "websites", id);
        const cleanedSite = removeUndefinedProps(newSite);
        batch.set(docRef, cleanedSite);
    });
    await batch.commit();
    console.log("Initial data seeded to Firestore.");
}
