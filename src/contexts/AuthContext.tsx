import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/firebase';
import { AuthState, User } from '@/types';
import axios from 'axios';

// Extended User interface for auth context
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'admin' | 'staff';
  branch: string | null;
  isActive: boolean;
  profileImage: string | null;
  username?: string;
  phone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  businessName?: string;
  gender?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  phoneNumber: string;
  businessName: string;
  profileImage?: string;
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  resetPassword: (email: string) => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  errorMessage: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
    token: undefined,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to get user data from Firestore
  const getUserFromFirestore = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        const fullUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          username: userData.username || userData.email || firebaseUser.email || '',
          phone: userData.phone || userData.phoneNumber || '',
          district: userData.district || '',
          sector: userData.sector || '',
          cell: userData.cell || '',
          village: userData.village || '',
          role: userData.role || 'staff',
          branch: userData.branch || null,
          isActive: userData.isActive !== false,
          imagephoto: userData.imagephoto || userData.profileImage || null,
          profileImage: userData.profileImage || userData.imagephoto || null,
          businessName: userData.businessName || '',
          gender: userData.gender || '',
        };

        return fullUser;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setErrorMessage('Failed to load user data. Please try again.');
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const userData = await getUserFromFirestore(firebaseUser);
        
        if (userData) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          setAuthState({
            user: userData,
            isAuthenticated: true,
            loading: false,
            token,
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false,
            token: undefined,
          });
        }
      } else {
        delete axios.defaults.headers.common['Authorization'];
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false,
          token: undefined,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    setErrorMessage(null);

    try {
      let email = identifier;
      
      if (!identifier.includes('@')) {
        setErrorMessage('Please use your email address to login.');
        setAuthState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      let message = 'Login failed. Please check your credentials.';
      
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many failed attempts. Please try again later.';
      
      setErrorMessage(message);
      setAuthState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return true;
    } catch (error: any) {
      let message = 'Google login failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') message = 'Login cancelled.';
      else if (error.code === 'auth/popup-blocked') message = 'Popup blocked. Please allow popups and try again.';
      
      setErrorMessage(message);
      setAuthState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setErrorMessage(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      let message = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      
      throw new Error(message);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      setAuthState((prev) => ({ ...prev, user: updatedUser }));
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    setErrorMessage(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      const userDataToSave: Partial<User> = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        username: data.email,
        phone: data.phoneNumber,
        district: data.district,
        sector: data.sector,
        cell: data.cell,
        village: data.village,
        role: 'admin',
        branch: null,
        isActive: false,
        profileImage: data.profileImage || null,
        imagephoto: data.profileImage || null,
        businessName: data.businessName,
        gender: data.gender,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userDataToSave);
      return true;
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      
      setErrorMessage(message);
      setAuthState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  const clearError = () => setErrorMessage(null);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        loginWithGoogle,
        logout,
        updateUser,
        resetPassword,
        register,
        errorMessage,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};