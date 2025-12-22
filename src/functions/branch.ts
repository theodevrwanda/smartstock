// src/functions/branch.ts
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface Branch {
  id?: string;
  branchName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  createdAt?: string;
}
// Get all branches
export const getBranches = async (): Promise<Branch[]> => {
  try {
    const branchesRef = collection(db, 'branches');
    const snapshot = await getDocs(branchesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Branch));
  } catch (error) {
    toast.error('Failed to fetch branches');
    console.error(error);
    return [];
  }
};
// Add new branch
export const addBranch = async (branchData: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch | null> => {
  try {
    const branchesRef = collection(db, 'branches');
    const docRef = await addDoc(branchesRef, {
      ...branchData,
      createdAt: new Date().toISOString(),
    });
    toast.success('Branch created successfully!');
    return { id: docRef.id, ...branchData, createdAt: new Date().toISOString() };
  } catch (error) {
    toast.error('Failed to create branch');
    console.error(error);
    return null;
  }
};
// Update existing branch
export const updateBranch = async (id: string, branchData: Partial<Branch>): Promise<boolean> => {
  try {
    const branchRef = doc(db, 'branches', id);
    await updateDoc(branchRef, branchData);
    toast.success('Branch updated successfully!');
    return true;
  } catch (error) {
    toast.error('Failed to update branch');
    console.error(error);
    return false;
  }
};
// Delete single branch
export const deleteBranch = async (id: string): Promise<boolean> => {
  try {
    const branchRef = doc(db, 'branches', id);
    await deleteDoc(branchRef);
    toast.success('Branch deleted successfully!');
    return true;
  } catch (error) {
    toast.error('Failed to delete branch');
    console.error(error);
    return false;
  }
};
// Delete multiple branches
export const deleteMultipleBranches = async (ids: string[]): Promise<boolean> => {
  try {
    await Promise.all(ids.map(id => deleteBranch(id)));
    toast.success(`${ids.length} branch(es) deleted successfully!`);
    return true;
  } catch (error) {
    toast.error('Failed to delete selected branches');
    console.error(error);
    return false;
  }
};