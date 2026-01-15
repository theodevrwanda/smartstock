import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import { doc, getDoc, setDoc, addDoc, collection, updateDoc, onSnapshot, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/firebase/firebase';
import { AuthState, User } from '@/types/interface';
import { saveUserLocally, getLocalUser, addPendingOperation } from '@/lib/offlineDB';
import axios from 'axios';

// Extended User interface for auth context
export interface AuthUser extends User {
  businessId?: string;
  businessName?: string;
  businessActive?: boolean;
  stockSettings?: {
    lowStock: number;
    outOfStock: number;
  };
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
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  updateUserAndSync: (userData: Partial<AuthUser>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  errorMessage: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage key for cached user
const CACHED_USER_KEY = 'pixelmart_cached_user';

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
  const [authState, setAuthState] = useState<AuthState & { user: AuthUser | null }>({
    user: null,
    isAuthenticated: false,
    loading: true,
    token: undefined,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load cached user from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(CACHED_USER_KEY);
    if (cached) {
      try {
        const cachedUser = JSON.parse(cached);
        setAuthState(prev => ({
          ...prev,
          user: cachedUser,
          isAuthenticated: true,
        }));
      } catch (e) {
        localStorage.removeItem(CACHED_USER_KEY);
      }
    }
  }, []);

  // Cache user to localStorage whenever it changes
  useEffect(() => {
    if (authState.user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(authState.user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  }, [authState.user]);

  // Function to get business status
  const getBusinessStatus = async (businessId: string): Promise<{ isActive: boolean; businessName: string; stockSettings?: { lowStock: number; outOfStock: number } }> => {
    try {
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        return {
          isActive: data.isActive !== false,
          businessName: data.businessName || '',
          stockSettings: {
            lowStock: data.lowStockThreshold ?? 10,
            outOfStock: data.outOfStockThreshold ?? 0,
          },
        };
      }
      return { isActive: true, businessName: '' };
    } catch (error) {
      console.error('Error fetching business status:', error);
      return { isActive: true, businessName: '' };
    }
  };

  // Function to get user data from Firestore
  const getUserFromFirestore = async (firebaseUser: FirebaseUser): Promise<AuthUser | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Get business status if user has businessId
        let businessActive = true;
        let businessName = userData.businessName || '';
        let stockSettings = { lowStock: 10, outOfStock: 0 };
        if (userData.businessId) {
          const businessInfo = await getBusinessStatus(userData.businessId);
          businessActive = businessInfo.isActive;
          businessName = businessInfo.businessName || businessName;
          if (businessInfo.stockSettings) {
            stockSettings = businessInfo.stockSettings;
          }
        }

        const fullUser: AuthUser = {
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
          businessName,
          gender: userData.gender || '',
          businessId: userData.businessId || null,
          businessActive,
          stockSettings,
        };

        // Cache user locally in IndexedDB for offline access
        try {
          await saveUserLocally({
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.fullName,
            firstName: fullUser.firstName,
            lastName: fullUser.lastName,
            role: fullUser.role as 'admin' | 'staff',
            branch: fullUser.branch,
            businessId: fullUser.businessId || '',
            profileImage: fullUser.profileImage,
            imagephoto: fullUser.imagephoto,
            isActive: fullUser.isActive !== false,
          });
        } catch (e) {
          console.error('Failed to cache user locally:', e);
        }

        return fullUser;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Try to get from local cache if offline
      if (!navigator.onLine) {
        const cached = localStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      setErrorMessage('Failed to load user data. Please try again.');
      return null;
    }
  };

  // Set up real-time listener for user document
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const userData = await getUserFromFirestore(firebaseUser);

        if (userData) {
          // Check active status immediately
          if (!userData.isActive || !userData.businessActive) {
            await signOut(auth);
            setErrorMessage(
              !userData.isActive
                ? 'Your account has been deactivated. Please contact your administrator.'
                : 'Your business account is inactive. Please contact system administration.'
            );
            setAuthState({
              user: null,
              isAuthenticated: false,
              loading: false,
              token: undefined,
            });
            return;
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          setAuthState({
            user: userData,
            isAuthenticated: true,
            loading: false,
            token,
          });

          // Set up real-time listener for user document changes
          unsubscribeUser = onSnapshot(
            doc(db, 'users', firebaseUser.uid),
            async (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();

                // Get fresh business info
                let businessActive = true;
                let businessName = data.businessName || '';
                let stockSettings = { lowStock: 10, outOfStock: 0 };
                if (data.businessId) {
                  const businessInfo = await getBusinessStatus(data.businessId);
                  businessActive = businessInfo.isActive;
                  businessName = businessInfo.businessName || businessName;
                  if (businessInfo.stockSettings) {
                    stockSettings = businessInfo.stockSettings;
                  }
                }

                // Check active status on update
                if (data.isActive === false || businessActive === false) {
                  await signOut(auth);
                  setErrorMessage(
                    data.isActive === false
                      ? 'Your account has been deactivated.'
                      : 'Your business account has been deactivated.'
                  );
                  // Auth state will be handled by the main onAuthStateChanged listener triggering again with null
                  return;
                }

                const updatedUser: AuthUser = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || data.email || '',
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                  username: data.username || data.email || firebaseUser.email || '',
                  phone: data.phone || data.phoneNumber || '',
                  district: data.district || '',
                  sector: data.sector || '',
                  cell: data.cell || '',
                  village: data.village || '',
                  role: data.role || 'staff',
                  branch: data.branch || null,
                  isActive: data.isActive !== false,
                  imagephoto: data.imagephoto || data.profileImage || null,
                  profileImage: data.profileImage || data.imagephoto || null,
                  businessName,
                  gender: data.gender || '',
                  businessId: data.businessId || null,
                  businessActive,
                  stockSettings,
                };

                setAuthState(prev => ({
                  ...prev,
                  user: updatedUser,
                }));
              }
            },
            (error) => {
              console.error('User listener error:', error);
            }
          );
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

        // Clean up user listener
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    setErrorMessage(null);

    try {
      // Validate email format
      if (!identifier.includes('@') || !identifier.trim()) {
        setErrorMessage('invalid_email');
        setAuthState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      const email = identifier.toLowerCase().trim();

      // 1. Check if user document exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User document does NOT exist
        setErrorMessage('user_not_found_create');
        setAuthState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // User exists in Firestore → Get the document to check status
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Check user active status
      if (userData.isActive === false) {
        setErrorMessage('user_inactive_wait_admin');
        setAuthState((prev) => ({ ...prev, loading: false }));
        return false;
      }

      // Check business active status (if businessId exists)
      if (userData.businessId) {
        const businessDoc = await getDoc(doc(db, 'businesses', userData.businessId));
        if (businessDoc.exists()) {
          const businessData = businessDoc.data();
          if (businessData.isActive === false) {
            setErrorMessage('business_inactive_wait_central');
            setAuthState((prev) => ({ ...prev, loading: false }));
            return false;
          }
        }
      }

      // All checks passed → Now try Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);

      // Success! onAuthStateChanged will handle the rest
      return true;

    } catch (error: any) {
      console.error('Login error:', error.code, error.message);

      let messageKey = error.message || 'An error occurred';

      // Remove "Firebase: " prefix if present
      if (messageKey.includes('Firebase: ')) {
        messageKey = messageKey.replace('Firebase: ', '');
      }

      // Only possible Firebase error now is wrong password (since user exists and is active)
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-login-credentials'
      ) {
        messageKey = 'wrong_password'; // Key for "Wrong password"
      } else if (error.code === 'auth/too-many-requests') {
        messageKey = 'too_many_attempts';
      } else if (error.code === 'auth/network-request-failed') {
        messageKey = 'network_error';
      }

      setErrorMessage(messageKey);
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
      localStorage.removeItem(CACHED_USER_KEY);
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

  // Update user state immediately (for local UI update)
  const updateUser = useCallback((userData: Partial<AuthUser>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...userData };
      return { ...prev, user: updatedUser };
    });
  }, []);

  // Update user and sync to Firestore (with offline support)
  const updateUserAndSync = useCallback(async (userData: Partial<AuthUser>): Promise<boolean> => {
    if (!authState.user?.id) return false;

    // Immediately update local state
    updateUser(userData);

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // Queue for sync when back online
      try {
        await addPendingOperation({
          type: 'updateProduct', // Reusing type, will handle in sync
          data: {
            collection: 'users',
            id: authState.user.id,
            updates: userData,
          },
        });
      } catch (e) {
        console.error('Failed to queue user update:', e);
      }
      return true;
    }

    // Online: update Firestore directly
    try {
      const userRef = doc(db, 'users', authState.user.id);
      const updateData: any = { ...userData, updatedAt: new Date().toISOString() };

      // Handle fullName
      if (userData.firstName || userData.lastName) {
        updateData.fullName = `${userData.firstName || authState.user.firstName} ${userData.lastName || authState.user.lastName}`.trim();
      }

      await updateDoc(userRef, updateData);
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      // Queue for retry
      try {
        await addPendingOperation({
          type: 'updateProduct',
          data: {
            collection: 'users',
            id: authState.user.id,
            updates: userData,
          },
        });
      } catch (e) {
        console.error('Failed to queue user update:', e);
      }
      return false;
    }
  }, [authState.user, updateUser]);

  // Refresh user data from Firestore
  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    const userData = await getUserFromFirestore(auth.currentUser);
    if (userData) {
      setAuthState(prev => ({
        ...prev,
        user: userData,
      }));
    }
  }, []);

  const register = async (data: RegisterData): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    setErrorMessage(null);

    try {
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Step 2: Create business document in businesses collection
      const businessData = {
        businessName: data.businessName,
        district: data.district,
        sector: data.sector,
        cell: data.cell,
        village: data.village,
        ownerId: userCredential.user.uid,
        isActive: false, // Business is inactive by default, needs central admin approval
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const businessRef = await addDoc(collection(db, 'businesses'), businessData);

      // Step 3: Create user document in users collection with businessId
      const userDataToSave = {
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
        role: 'admin', // Default role for business owner
        branch: null,
        isActive: false, // User is inactive by default
        profileImage: data.profileImage || null,
        imagephoto: data.profileImage || null,
        businessId: businessRef.id,
        gender: data.gender,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userDataToSave);

      // Sign out immediately after registration
      await signOut(auth);

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
        updateUserAndSync,
        refreshUser,
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
