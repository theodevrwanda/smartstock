// src/functions/branch.ts

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  getDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction } from '@/lib/transactionLogger';

import { Branch } from '@/types/interface';
export type { Branch };

// Transaction context for logging
let txContext: {
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
} | null = null;

export const setBranchTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

// Real-time subscription to branches
export const subscribeToBranches = (
  businessId: string,
  onUpdate: (branches: Branch[]) => void
): () => void => {
  if (!businessId) {
    console.warn('No businessId provided for branch subscription');
    return () => {};
  }

  const branchesRef = collection(db, 'branches');
  const q = query(branchesRef, where('businessId', '==', businessId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const branches: Branch[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Branch));
      onUpdate(branches);
    },
    (error) => {
      console.error('Real-time branches subscription error:', error);
      toast.error('Failed to sync branches in real-time');
    }
  );

  return unsubscribe;
};

// Get all branches for a business
export const getBranches = async (businessId: string): Promise<Branch[]> => {
  if (!businessId) {
    console.error('getBranches: Missing businessId');
    toast.error('Cannot load branches: No business selected');
    return [];
  }

  try {
    const branchesRef = collection(db, 'branches');
    const q = query(branchesRef, where('businessId', '==', businessId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Branch));
  } catch (error) {
    console.error('Error fetching branches:', error);
    toast.error('Failed to load branches');
    return [];
  }
};

// Check if branch name already exists in the business
const checkBranchDuplicate = async (
  businessId: string,
  branchName: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const branchesRef = collection(db, 'branches');
    let q = query(
      branchesRef,
      where('businessId', '==', businessId),
      where('branchName', '==', branchName.trim())
    );

    if (excludeId) {
      // For updates, exclude current branch from duplicate check
      const snapshot = await getDocs(q);
      return snapshot.docs.some((doc) => doc.id !== excludeId);
    }

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking branch duplicate:', error);
    return false;
  }
};

// Add new branch
export const addBranch = async (
  branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Branch | null> => {
  if (!branchData.businessId) {
    toast.error('Business ID is required');
    return null;
  }

  if (!branchData.branchName?.trim()) {
    toast.error('Branch name is required');
    return null;
  }

  const trimmedName = branchData.branchName.trim();

  try {
    const isDuplicate = await checkBranchDuplicate(branchData.businessId, trimmedName);
    if (isDuplicate) {
      toast.error('A branch with this name already exists');
      return null;
    }

    const branchesRef = collection(db, 'branches');
    const docRef = await addDoc(branchesRef, {
      ...branchData,
      branchName: trimmedName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newBranch: Branch = {
      id: docRef.id,
      ...branchData,
      branchName: trimmedName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Log transaction
    if (txContext) {
      await logTransaction({
        transactionType: 'branch_created',
        actionDetails: `Created new branch: ${trimmedName} in ${branchData.district}, ${branchData.sector}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: branchData.businessId,
        businessName: txContext.businessName,
        branchId: docRef.id,
        branchName: trimmedName,
        metadata: { ...branchData, branchName: trimmedName },
      });
    }

    toast.success(`Branch "${trimmedName}" created successfully!`);
    return newBranch;
  } catch (error: any) {
    console.error('Error adding branch:', error);
    toast.error(error.code === 'permission-denied' ? 'Permission denied' : 'Failed to create branch');
    return null;
  }
};

// Update existing branch
export const updateBranch = async (
  id: string,
  updates: Partial<Omit<Branch, 'id' | 'businessId' | 'createdAt'>>
): Promise<boolean> => {
  if (!id) {
    toast.error('Invalid branch ID');
    return false;
  }

  const trimmedName = updates.branchName?.trim();
  if (trimmedName === '') {
    toast.error('Branch name cannot be empty');
    return false;
  }

  try {
    const branchRef = doc(db, 'branches', id);
    const branchSnap = await getDoc(branchRef);

    if (!branchSnap.exists()) {
      toast.error('Branch not found');
      return false;
    }

    const currentData = branchSnap.data() as Branch;

    // Check for duplicate name (excluding current branch)
    if (trimmedName && trimmedName !== currentData.branchName) {
      const isDuplicate = await checkBranchDuplicate(currentData.businessId, trimmedName, id);
      if (isDuplicate) {
        toast.error('Another branch with this name already exists');
        return false;
      }
    }

    const updatePayload: Partial<Branch> = {
      ...updates,
      ...(trimmedName && { branchName: trimmedName }),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(branchRef, updatePayload);

    // Log transaction
    if (txContext) {
      await logTransaction({
        transactionType: 'branch_updated',
        actionDetails: `Updated branch: ${trimmedName || currentData.branchName}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: currentData.businessId,
        businessName: txContext.businessName,
        branchId: id,
        branchName: trimmedName || currentData.branchName,
        metadata: updatePayload,
      });
    }

    toast.success(`Branch updated successfully!`);
    return true;
  } catch (error: any) {
    console.error('Error updating branch:', error);
    toast.error(error.code === 'permission-denied' ? 'Permission denied' : 'Failed to update branch');
    return false;
  }
};

// Delete single branch
export const deleteBranch = async (id: string): Promise<boolean> => {
  if (!id) {
    toast.error('Invalid branch ID');
    return false;
  }

  try {
    const branchRef = doc(db, 'branches', id);
    const branchSnap = await getDoc(branchRef);

    if (!branchSnap.exists()) {
      toast.error('Branch not found');
      return false;
    }

    const branchData = branchSnap.data() as Branch;

    await deleteDoc(branchRef);

    // Log transaction
    if (txContext) {
      await logTransaction({
        transactionType: 'branch_deleted',
        actionDetails: `Deleted branch: ${branchData.branchName}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: branchData.businessId,
        businessName: txContext.businessName,
        branchId: id,
        branchName: branchData.branchName,
        metadata: { ...branchData },
      });
    }

    toast.success(`Branch "${branchData.branchName}" deleted successfully!`);
    return true;
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    toast.error(error.code === 'permission-denied' ? 'Permission denied' : 'Failed to delete branch');
    return false;
  }
};

// Delete multiple branches using batch for better performance
export const deleteMultipleBranches = async (ids: string[]): Promise<boolean> => {
  if (!ids || ids.length === 0) {
    toast.error('No branches selected');
    return false;
  }

  try {
    const batch = writeBatch(db);
    const branchNames: string[] = [];

    for (const id of ids) {
      const branchRef = doc(db, 'branches', id);
      const snap = await getDoc(branchRef);
      if (snap.exists()) {
        const data = snap.data() as Branch;
        branchNames.push(data.branchName);
        batch.delete(branchRef);
      }
    }

    await batch.commit();

    // Log one transaction for bulk delete
    if (txContext && branchNames.length > 0) {
      await logTransaction({
        transactionType: 'branch_bulk_deleted',
        actionDetails: `Deleted ${ids.length} branch(es): ${branchNames.join(', ')}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        metadata: { deletedBranchIds: ids, deletedBranchNames: branchNames },
      });
    }

    toast.success(`${ids.length} branch(es) deleted successfully!`);
    return true;
  } catch (error: any) {
    console.error('Error deleting multiple branches:', error);
    toast.error(error.code === 'permission-denied' ? 'Permission denied' : 'Failed to delete branches');
    return false;
  }
};

export { toast } from 'sonner';