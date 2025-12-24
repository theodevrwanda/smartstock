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
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface Employee {
  id?: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  gender?: string;
  role: 'admin' | 'staff';
  branch: string | null;
  businessId: string;
  businessName?: string;
  isActive: boolean;
  profileImage?: string | null;
  imagephoto?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Simple duplicate check for email and phone
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

// Create employee using secondary auth instance (prevents admin logout)
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
    // Check duplicates
    const dup = await checkDuplicates(data.email, data.phone);
    if (dup) {
      toast.error(dup);
      return null;
    }

    // Create Auth user using SECONDARY auth instance (doesn't affect current user session)
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      data.email.trim().toLowerCase(),
      '1234567'
    );

    const uid = userCredential.user.uid;

    // Sign out from secondary auth immediately (just cleanup, doesn't affect main auth)
    await signOut(secondaryAuth);

    // Prepare data
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

    // Save with setDoc - creates new document
    await setDoc(doc(db, 'users', uid), employeeData);

    toast.success('Employee created! Default password: 1234567');

    return {
      id: uid,
      ...employeeData,
    };
  } catch (error: any) {
    console.error('Create employee error:', error);

    let msg = 'Failed to create employee';
    if (error.code === 'auth/email-already-in-use') msg = 'Email already registered';
    else if (error.code === 'auth/invalid-email') msg = 'Invalid email';
    else if (error.code === 'auth/weak-password') msg = 'Password too weak';

    toast.error(msg);
    return null;
  }
};

// Other functions unchanged
export const updateEmployee = async (id: string, updates: Partial<Omit<Employee, 'id'>>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Updated successfully');
    return true;
  } catch {
    toast.error('Update failed');
    return false;
  }
};

export const assignBranchToEmployee = async (employeeId: string, branchId: string | null): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', employeeId), { branch: branchId });
    toast.success('Branch assigned');
    return true;
  } catch {
    toast.error('Assign failed');
    return false;
  }
};

export const deleteEmployee = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'users', id));
    toast.success('Deleted');
    return true;
  } catch {
    toast.error('Delete failed');
    return false;
  }
};

export const deleteMultipleEmployees = async (ids: string[]): Promise<boolean> => {
  try {
    await Promise.all(ids.map(id => deleteEmployee(id)));
    toast.success(`${ids.length} deleted`);
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
    toast.error('Load failed');
    return [];
  }
};