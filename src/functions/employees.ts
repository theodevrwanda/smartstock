// src/functions/employees.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/firebase/firebase';
import { toast } from 'sonner';

export interface Employee {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  role: 'admin' | 'staff';
  branch: string | null;
  isActive: boolean;
  createdAt?: string;
  profileImage?: string | null;
}

// Get all employees
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Employee));
  } catch (error) {
    toast.error('Failed to fetch employees');
    console.error(error);
    return [];
  }
};

// Create employee with default password "123456"
export const createEmployee = async (
  data: Omit<Employee, 'id' | 'createdAt' | 'isActive'>
): Promise<Employee | null> => {
  try {
    // Create Auth user with default password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      '123456' // Default password
    );

    // Save full profile to Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const employeeData = {
      ...data,
      isActive: false,
      createdAt: new Date().toISOString(),
      profileImage: null,
    };
    await updateDoc(userDocRef, employeeData);

    toast.success('Employee created! Default password: 123456');

    return {
      id: userCredential.user.uid,
      ...employeeData,
    };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      toast.error('This email is already registered.');
    } else {
      toast.error('Failed to create employee');
    }
    console.error(error);
    return null;
  }
};

// Update employee
export const updateEmployee = async (
  id: string,
  data: Partial<Employee>
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, data);
    toast.success('Employee updated successfully');
    return true;
  } catch (error) {
    toast.error('Failed to update employee');
    console.error(error);
    return false;
  }
};

// Assign/Unassign branch
export const assignBranchToEmployee = async (
  employeeId: string,
  branchId: string | null
): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', employeeId);
    await updateDoc(userRef, { branch: branchId });
    toast.success(
      branchId ? 'Branch assigned successfully' : 'Branch unassigned'
    );
    return true;
  } catch (error) {
    toast.error('Failed to assign branch');
    console.error(error);
    return false;
  }
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', id);
    await deleteDoc(userRef);
    toast.success('Employee deleted successfully');
    return true;
  } catch (error) {
    toast.error('Failed to delete employee');
    console.error(error);
    return false;
  }
};

// Delete multiple employees
export const deleteMultipleEmployees = async (ids: string[]): Promise<boolean> => {
  try {
    await Promise.all(ids.map(id => deleteEmployee(id)));
    toast.success(`${ids.length} employee(s) deleted`);
    return true;
  } catch (error) {
    toast.error('Failed to delete employees');
    return false;
  }
};