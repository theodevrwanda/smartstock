import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/firebase';
import { AuthState, User } from '@/types';
import axios from 'axios';

// Update the User interface to focus on branch ID
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'admin' | 'staff';
  branch: string | null; // Branch ID as string
  isActive: boolean;
  profileImage: string | null;
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  resetPassword: (email: string) => Promise<void>;
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

  // Function to validate ObjectId format (simple regex for MongoDB ObjectId)
  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Function to get user data from Firestore
  const getUserFromFirestore = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'role', 'isActive'];
        const missingFields = requiredFields.filter(field => userData[field] === undefined || userData[field] === null);
        if (missingFields.length > 0) {
          console.error(`Missing required fields: ${missingFields.join(', ')}`);
          setErrorMessage(`User data incomplete: missing ${missingFields.join(', ')}. Please contact support.`);
          await signOut(auth);
          return null;
        }

        // Check if user is active
        if (!userData.isActive) {
          setErrorMessage('Your account is not activated. Please contact support.');
          await signOut(auth);
          return null;
        }

        // Validate role
        if (!['admin', 'staff'].includes(userData.role)) {
          setErrorMessage('Invalid user role. Please contact support.');
          await signOut(auth);
          return null;
        }

        // Create full user object with Firebase data
        const fullUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          fullName: `${userData.firstName} ${userData.lastName}`.trim(),
          role: userData.role,
          branch: userData.branch || null, // Allow any branch value, including null
          isActive: userData.isActive,
          profileImage: userData.imagephoto|| firebaseUser.imagephoto || null,
        };

        return fullUser;
      } else {
        setErrorMessage('User data not found. Please contact support.');
        await signOut(auth);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setErrorMessage('Failed to load user data. Please try again.');
      return null;
    }
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const userData = await getUserFromFirestore(firebaseUser);
        
        if (userData) {
          // Configure axios to use Firebase token for backend requests
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
        // Remove auth headers when logged out
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
      // For Firebase, we need to use email for login
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
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
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
      
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Login cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Popup blocked. Please allow popups and try again.';
      }
      
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
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      
      throw new Error(message);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      setAuthState((prev) => ({ ...prev, user: updatedUser }));
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
        errorMessage,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};