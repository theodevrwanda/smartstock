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
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { toast } from 'sonner';
import { logTransaction } from '@/lib/transactionLogger';

import { Branch } from '@/types/interface';

// Transaction context (set before calling functions that log)
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

// Get all branches for a specific business
export const getBranches = async (businessId: string): Promise<Branch[]> => {
  try {
    if (!businessId) {
      console.error('No businessId provided');
      return [];
    }
    const branchesRef = collection(db, 'branches');
    const q = query(branchesRef, where('businessId', '==', businessId));
    const snapshot = await getDocs(q);
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

// Add new branch with businessId + log transaction
export const addBranch = async (
  branchData: Omit<Branch, 'id' | 'createdAt'>
): Promise<Branch | null> => {
  try {
    if (!branchData.businessId) {
      toast.error('Business ID is required');
      return null;
    }
    const branchesRef = collection(db, 'branches');
    const docRef = await addDoc(branchesRef, {
      ...branchData,
      createdAt: new Date().toISOString(),
    });

    // Log branch created
    if (txContext) {
      await logTransaction({
        transactionType: 'branch_created',
        actionDetails: `Created new branch: ${branchData.branchName} (${branchData.district}, ${branchData.sector})`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: branchData.businessId,
        businessName: txContext.businessName,
        branchId: docRef.id,
        branchName: branchData.branchName,
        metadata: branchData,
      });
    }

    toast.success('Branch created successfully!');
    return { id: docRef.id, ...branchData, createdAt: new Date().toISOString() };
  } catch (error) {
    toast.error('Failed to create branch');
    console.error(error);
    return null;
  }
};

// Update existing branch + log transaction
export const updateBranch = async (
  id: string,
  branchData: Partial<Branch>
): Promise<boolean> => {
  try {
    const branchRef = doc(db, 'branches', id);
    await updateDoc(branchRef, {
      ...branchData,
      updatedAt: new Date().toISOString(),
    });

    // Log branch updated
    if (txContext) {
      await logTransaction({
        transactionType: 'branch_updated',
        actionDetails: `Updated branch: ${branchData.branchName || id}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        branchId: id,
        branchName: branchData.branchName || undefined,
        metadata: branchData,
      });
    }

    toast.success('Branch updated successfully!');
    return true;
  } catch (error) {
    toast.error('Failed to update branch');
    console.error(error);
    return false;
  }
};

// Delete single branch + log transaction
export const deleteBranch = async (id: string): Promise<boolean> => {
  try {
    const branchRef = doc(db, 'branches', id);
    const branchSnap = await getDoc(branchRef);
    const branchData = branchSnap.exists() ? branchSnap.data() as Branch : null;

    await deleteDoc(branchRef);

    // Log branch deleted
    if (txContext && branchData) {
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

export { toast } from 'sonner';