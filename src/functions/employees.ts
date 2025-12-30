// src/functions/employees.ts

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signOut,
  updateEmail as firebaseUpdateEmail
} from 'firebase/auth';
import { db, secondaryAuth, auth } from '@/firebase/firebase'; // Make sure auth is imported
import { toast } from 'sonner';
import { logTransaction } from '@/lib/transactionLogger';

import { Employee } from '@/types/interface';

// Transaction context
let txContext: {
  userId: string;
  userName: string;
  userRole: 'admin' | 'staff';
  businessId: string;
  businessName: string;
} | null = null;

export const setEmployeeTransactionContext = (ctx: typeof txContext) => {
  txContext = ctx;
};

const checkDuplicates = async (email: string, phone: string): Promise<string | null> => {
  const usersRef = collection(db, 'users');
  const checks = [
    getDocs(query(usersRef, where('email', '==', email.toLowerCase().trim()))),
  ];
  if (phone.trim()) {
    checks.push(getDocs(query(usersRef, where('phone', '==', phone.trim()))));
  }

  const [emailSnap, phoneSnap] = await Promise.all(checks);

  if (!emailSnap.empty) return 'Email already exists';
  if (phoneSnap && !phoneSnap.empty) return 'Phone already exists';

  return null;
};

// NEW: Update email in Firebase Auth (admin only)
export const updateEmployeeEmail = async (uid: string, newEmail: string): Promise<boolean> => {
  try {
    // Use secondaryAuth to update any user's email (admin privilege required in security rules)
    const user = secondaryAuth.currentUser;
    if (!user) {
      toast.error('Authentication required');
      return false;
    }

    await firebaseUpdateEmail(user, newEmail.trim().toLowerCase());

    // Also update in Firestore
    await updateDoc(doc(db, 'users', uid), {
      email: newEmail.trim().toLowerCase(),
      username: newEmail.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    });

    // Log transaction
    if (txContext) {
      await logTransaction({
        transactionType: 'employee_updated',
        actionDetails: `Changed employee email to: ${newEmail}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        metadata: { employeeId: uid, newEmail },
      });
    }

    toast.success('Email updated successfully');
    return true;
  } catch (error: any) {
    console.error('Update email error:', error);
    let msg = 'Failed to update email';
    if (error.code === 'auth/email-already-in-use') msg = 'This email is already in use';
    else if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
    else if (error.code === 'auth/requires-recent-login') msg = 'Please re-login to update email';

    toast.error(msg);
    return false;
  }
};

// Create employee
export const createEmployee = async (
  data: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    gender?: string;
    branch?: string | null;
    businessId: string;
    businessName?: string;
  }
): Promise<Employee | null> => {
  try {
    const dup = await checkDuplicates(data.email, data.phone);
    if (dup) {
      toast.error(dup);
      return null;
    }

    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      data.email.trim().toLowerCase(),
      '1234567'
    );

    const uid = userCredential.user.uid;
    await signOut(secondaryAuth);

    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;

    const employeeData = {
      email: data.email.trim().toLowerCase(),
      username: data.email.trim().toLowerCase(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName,
      phone: data.phone.trim(),
      district: data.district.trim(),
      sector: data.sector.trim(),
      cell: data.cell.trim(),
      village: data.village.trim(),
      gender: data.gender || 'male',
      role: 'staff' as const,
      branch: data.branch || null,
      businessId: data.businessId,
      businessName: data.businessName || '',
      isActive: false,
      profileImage: null,
      imagephoto: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', uid), employeeData);

    if (txContext) {
      await logTransaction({
        transactionType: 'employee_added',
        actionDetails: `Added new employee: ${fullName} (${data.email})`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: data.businessId,
        businessName: txContext.businessName,
        metadata: {
          employeeId: uid,
          email: data.email,
          fullName,
          phone: data.phone,
          branch: data.branch || null,
        },
      });
    }

    toast.success('Employee created! Default password: 1234567');
    return { id: uid, ...employeeData };
  } catch (error: any) {
    console.error('Create employee error:', error);
    let msg = 'Failed to create employee';
    if (error.code === 'auth/email-already-in-use') msg = 'Email already registered';
    else if (error.code === 'auth/invalid-email') msg = 'Invalid email';
    toast.error(msg);
    return null;
  }
};

// Update employee (other fields)
export const updateEmployee = async (id: string, updates: Partial<Omit<Employee, 'id'>>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (txContext) {
      const changedFields = Object.keys(updates)
        .filter(k => k !== 'updatedAt' && k !== 'fullName')
        .join(', ') || 'details';

      await logTransaction({
        transactionType: 'employee_updated',
        actionDetails: `Updated employee: ${updates.firstName || ''} ${updates.lastName || ''} (${changedFields})`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        metadata: { employeeId: id, ...updates },
      });
    }

    toast.success('Employee updated successfully');
    return true;
  } catch {
    toast.error('Update failed');
    return false;
  }
};

// Rest of functions unchanged...
export const assignBranchToEmployee = async (
  employeeId: string,
  branchId: string | null,
  branchName?: string
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', employeeId), {
      branch: branchId,
      updatedAt: new Date().toISOString(),
    });

    if (txContext) {
      await logTransaction({
        transactionType: 'employee_updated',
        actionDetails: branchId
          ? `Assigned employee to branch: ${branchName || branchId}`
          : `Unassigned employee from branch`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        metadata: { employeeId, branchId, branchName },
      });
    }

    toast.success('Branch assigned successfully');
    return true;
  } catch {
    toast.error('Assign failed');
    return false;
  }
};

export const deleteEmployee = async (id: string, employeeName?: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'users', id));

    if (txContext) {
      await logTransaction({
        transactionType: 'employee_deleted',
        actionDetails: `Deleted employee: ${employeeName || id}`,
        userId: txContext.userId,
        userName: txContext.userName,
        userRole: txContext.userRole,
        businessId: txContext.businessId,
        businessName: txContext.businessName,
        metadata: { employeeId: id },
      });
    }

    toast.success('Employee deleted successfully');
    return true;
  } catch {
    toast.error('Delete failed');
    return false;
  }
};

export const deleteMultipleEmployees = async (ids: string[]): Promise<boolean> => {
  try {
    await Promise.all(ids.map(id => deleteEmployee(id, 'Multiple')));
    toast.success(`${ids.length} employees deleted`);
    return true;
  } catch {
    toast.error('Bulk delete failed');
    return false;
  }
};

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
  } catch {
    toast.error('Failed to load employees');
    return [];
  }
};

export { toast } from 'sonner';