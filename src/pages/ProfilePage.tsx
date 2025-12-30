// src/pages/ProfilePage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  LogOut,
  Key,
  Trash2,
  ArrowRight,
  Check,
  Building2,
  WifiOff,
  Loader2,
  Calendar,
  Shield,
  Briefcase,
  Camera,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import SEOHelmet from '@/components/SEOHelmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  updateEmail,
} from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { addPendingOperation } from '@/lib/offlineDB';

interface BusinessInfo {
  id: string;
  businessName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  isActive: boolean;
  createdAt?: any;
}

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const { user, logout, loading: authLoading, updateUser } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const auth = getAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [localImageData, setLocalImageData] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessFormData, setBusinessFormData] = useState({ businessName: '' });

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);

  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifyingCurrent, setIsVerifyingCurrent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    gender: '',
    businessName: '',
  });

  const isAdmin = user?.role === 'admin';

  // =================== ALL HANDLERS (DEFINED BEFORE USE) ===================

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setPreviewImage(base64Data);
        setLocalImageData(base64Data);
      };
      reader.readAsDataURL(file);

      toast({
        title: 'Image Selected',
        description: isOnline ? 'Preview updated. Will upload when you save.' : 'Image saved locally. Will upload when online.',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let newImageUrl = user.profileImage || null;

      if (selectedFile) {
        if (isOnline) {
          try {
            toast({ title: 'Uploading...', description: 'Uploading profile image...' });
            newImageUrl = await uploadToCloudinary(selectedFile);
            toast({ title: 'Success', description: 'Image uploaded!' });
            setLocalImageData(null);
          } catch (error) {
            toast({
              title: 'Upload Failed',
              description: 'Image saved locally. Will upload when connection improves.',
              variant: 'destructive',
            });
            if (localImageData) {
              await addPendingOperation('updateProduct', {
                type: 'imageUpload',
                userId: user.id,
                imageData: localImageData,
              });
            }
          }
        } else {
          toast({
            title: 'Offline Mode',
            description: 'Image saved locally. Will upload when online.',
          });
          if (localImageData) {
            await addPendingOperation('updateProduct', {
              type: 'imageUpload',
              userId: user.id,
              imageData: localImageData,
            });
          }
        }
      }

      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
        gender: formData.gender,
        profileImage: newImageUrl,
        imagephoto: newImageUrl,
      };

      updateUser({
        ...updateData,
        profileImage: localImageData || newImageUrl,
        imagephoto: localImageData || newImageUrl,
      });

      if (isOnline) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { ...updateData, updatedAt: new Date().toISOString() });
      } else {
        await addPendingOperation('updateProduct', {
          collection: 'users',
          id: user.id,
          updates: updateData,
        });
      }

      if (isAdmin && businessInfo && businessFormData.businessName !== businessInfo.businessName) {
        if (isOnline) {
          const businessRef = doc(db, 'businesses', businessInfo.id);
          await updateDoc(businessRef, {
            businessName: businessFormData.businessName,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await addPendingOperation('updateProduct', {
            collection: 'businesses',
            id: businessInfo.id,
            updates: { businessName: businessFormData.businessName },
          });
        }
        setBusinessInfo(prev => prev ? { ...prev, businessName: businessFormData.businessName } : null);
        updateUser({ businessName: businessFormData.businessName });
      }

      toast({
        title: 'Success',
        description: isOnline ? 'Profile updated successfully!' : 'Profile updated locally. Will sync when online.'
      });
      setIsEditing(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        district: user.district || '',
        sector: user.sector || '',
        cell: user.cell || '',
        village: user.village || '',
        gender: user.gender || '',
        businessName: user.businessName || '',
      });
      setPreviewImage(user.profileImage || '');
    }
    setSelectedFile(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'Signed out successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to log out.', variant: 'destructive' });
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Please enter your current password.');
      return;
    }

    setCurrentPasswordError('');
    setIsVerifyingCurrent(true);

    if (!auth.currentUser?.email) {
      toast({ title: 'Error', description: 'User email not found.', variant: 'destructive' });
      setIsVerifyingCurrent(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      setPasswordStep(2);
      toast({ title: 'Verified ✓', description: 'Current password correct. Set new one.' });
    } catch (error: any) {
      let message = 'Failed to verify password.';
      if (error.code === 'auth/wrong-password') {
        message = 'Incorrect current password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Try again later.';
      }
      setCurrentPasswordError(message);
      toast({ title: 'Failed', description: message, variant: 'destructive' });
    } finally {
      setIsVerifyingCurrent(false);
    }
  };

  const handleUpdateNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      toast({ title: 'Success', description: 'Password changed successfully!' });
      setChangePasswordOpen(false);
      setPasswordStep(1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordError('');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update password.', variant: 'destructive' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({ title: 'Error', description: 'Valid email required.', variant: 'destructive' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ title: 'Sent', description: 'Check your email for reset link.' });
      setResetPasswordOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send reset email.', variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    try {
      await deleteUser(auth.currentUser);
      toast({ title: 'Deleted', description: 'Account permanently deleted.' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({
          title: 'Re-login Needed',
          description: 'Please sign in again before deleting account.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Error', description: 'Failed to delete account.', variant: 'destructive' });
      }
    }
    setDeleteAccountOpen(false);
  };

  const handleUpdateEmail = async () => {
    if (!auth.currentUser?.email || !emailPassword.trim() || !newEmail.trim()) {
      setEmailUpdateError('Please fill all fields.');
      return;
    }

    if (!newEmail.includes('@')) {
      setEmailUpdateError('Please enter a valid email address.');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailUpdateError('');

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, emailPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updateEmail(auth.currentUser, newEmail);

      if (user) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { email: newEmail, updatedAt: new Date().toISOString() });
        updateUser({ email: newEmail });
      }

      toast({ title: 'Success', description: 'Email updated successfully!' });
      setChangeEmailOpen(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      let message = 'Failed to update email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/email-already-in-use') message = 'This email is already in use.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/requires-recent-login') message = 'Please log out and log in again.';
      setEmailUpdateError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const getRoleBadge = (role: 'admin' | 'staff') => (
    <Badge className={role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );

  // =================== DATA FETCHING ===================

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (user?.businessId) {
        try {
          const businessDoc = await getDoc(doc(db, 'businesses', user.businessId));
          if (businessDoc.exists()) {
            const data = businessDoc.data();
            setBusinessInfo({
              id: businessDoc.id,
              businessName: data.businessName || '',
              district: data.district || '',
              sector: data.sector || '',
              cell: data.cell || '',
              village: data.village || '',
              isActive: data.isActive !== false,
              createdAt: data.createdAt,
            });
            setBusinessFormData({ businessName: data.businessName || '' });
          }
        } catch (error) {
          console.error('Error fetching business info:', error);
        }
      }
    };

    if (!authLoading && user) {
      fetchBusinessInfo();
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        district: user.district || '',
        sector: user.sector || '',
        cell: user.cell || '',
        village: user.village || '',
        gender: user.gender || '',
        businessName: user.businessName || '',
      });
      setPreviewImage(user.profileImage || '');
      setResetEmail(user.email || '');
      setIsLoading(false);
    }
  }, [user, authLoading]);

  // =================== CONSISTENT LOADING STATE ===================

  // Consistent clean loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-gray-500">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  // =================== MAIN RENDER ===================

  return (
    <>
      <SEOHelmet title="My Profile" description="View and edit your profile" />
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950">
        {/* Modern Hero Section with Gradient */}
        <div className="relative bg-gradient-to-br from-[#FCD34D] via-amber-400 to-yellow-500 dark:from-amber-600 dark:via-amber-700 dark:to-amber-800 pb-32 pt-8">
          <div className="absolute inset-0 bg-black/5 dark:bg-black/20"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header Actions */}
            <div className="flex justify-end mb-6">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="bg-white/50 hover:bg-white/70 border-white/50 backdrop-blur-sm"
                  >
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-white shadow-2xl cursor-pointer ring-4 ring-white/50 transition-all duration-300 group-hover:ring-white/80"
                  onClick={handleImageClick}
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                      <UserIcon className="h-16 w-16 md:h-20 md:w-20 text-gray-400" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-center">
                        <Camera className="h-8 w-8 text-white mx-auto mb-1" />
                        <p className="text-xs text-white font-medium">Change Photo</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {user.fullName || `${user.firstName} ${user.lastName}`}
                </h1>
                <p className="text-white/90 text-lg mb-3 drop-shadow">{user.email}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {getRoleBadge(user.role)}
                  <Badge variant={user.isActive ? "default" : "secondary"} className="bg-white/90 text-gray-900 hover:bg-white">
                    {user.isActive ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      'Pending Approval'
                    )}
                  </Badge>
                  {isOnline ? (
                    <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white">
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-white/70">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-24 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information Card */}
            <Card className="lg:col-span-2 shadow-xl border-0 dark:bg-gray-800">
              <CardHeader className="border-b dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UserIcon className="h-5 w-5 text-[#FCD34D]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      First Name
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.firstName}
                        onChange={e => handleInputChange('firstName', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.firstName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      Last Name
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.lastName}
                        onChange={e => handleInputChange('lastName', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.lastName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Shield className="h-4 w-4 text-gray-400" />
                      Full Name
                    </Label>
                    <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                      {user.fullName || 'Not set'}
                    </p>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      Gender
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.gender}
                        onChange={e => handleInputChange('gender', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.gender || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email Address
                    </Label>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.email}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setNewEmail(user.email || ''); setChangeEmailOpen(true); }}
                        className="rounded-xl"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Phone className="h-4 w-4 text-gray-400" />
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.phone || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* District */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      District
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.district}
                        onChange={e => handleInputChange('district', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.district || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Sector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Sector
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.sector}
                        onChange={e => handleInputChange('sector', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.sector || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Cell */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Cell
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.cell}
                        onChange={e => handleInputChange('cell', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.cell || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Village */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Village
                    </Label>
                    {isEditing ? (
                      <Input
                        value={formData.village}
                        onChange={e => handleInputChange('village', e.target.value)}
                        className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {user.village || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Information Card */}
            {businessInfo && (
              <Card className="lg:col-span-2 shadow-xl border-0 dark:bg-gray-800">
                <CardHeader className="border-b dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-[#FCD34D]" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Name */}
                    <div className="md:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        Business Name {!isAdmin && '(Admin only can edit)'}
                      </Label>
                      {isEditing && isAdmin ? (
                        <Input
                          value={businessFormData.businessName}
                          onChange={e => setBusinessFormData(prev => ({ ...prev, businessName: e.target.value }))}
                          className="h-11 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-[#FCD34D] focus:border-[#FCD34D]"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                          {businessInfo.businessName || 'Not set'}
                        </p>
                      )}
                    </div>

                    {/* Business Location Fields */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        District
                      </Label>
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {businessInfo.district || 'Not set'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Sector
                      </Label>
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {businessInfo.sector || 'Not set'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Cell
                      </Label>
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {businessInfo.cell || 'Not set'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Village
                      </Label>
                      <p className="text-gray-900 dark:text-white font-medium px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                        {businessInfo.village || 'Not set'}
                      </p>
                    </div>

                    {/* Business Status */}
                    <div className="md:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Shield className="h-4 w-4 text-gray-400" />
                        Business Status
                      </Label>
                      <div>
                        <Badge variant={businessInfo.isActive ? "default" : "secondary"} className="text-sm">
                          {businessInfo.isActive ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            'Pending Approval'
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings Sidebar */}
            <div className="space-y-6">
              {/* Connection Status Card */}
              {pendingCount > 0 && (
                <Card className="shadow-xl border-0 dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">Pending Sync</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Settings Card */}
              <Card className="shadow-xl border-0 dark:bg-gray-800">
                <CardHeader className="border-b dark:border-gray-700">
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => { setNewEmail(user?.email || ''); setChangeEmailOpen(true); }}
                  >
                    <Mail className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="flex-1 text-left">Change Email</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    <Key className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="flex-1 text-left">Change Password</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setResetPasswordOpen(true)}
                  >
                    <Mail className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="flex-1 text-left">Reset via Email</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Button>

                  <div className="pt-2 border-t dark:border-gray-700">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                      onClick={() => setDeleteAccountOpen(true)}
                    >
                      <Trash2 className="mr-3 h-4 w-4" />
                      <span className="flex-1 text-left">Delete Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 mt-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4 text-gray-500" />
                      <span className="flex-1 text-left">Sign Out</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {passwordStep === 1 ? 'Verify Your Identity' : 'Create New Password'}
            </DialogTitle>
            <DialogDescription>
              {passwordStep === 1
                ? 'Enter your current password to proceed.'
                : 'Your new password must be at least 6 characters long.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {passwordStep === 1 ? (
              <div className="space-y-4">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setCurrentPasswordError('');
                  }}
                  placeholder="Enter your current password"
                  autoFocus
                />
                {currentPasswordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{currentPasswordError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoFocus
                />
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">Passwords do not match.</p>
                )}
                {newPassword && newPassword.length < 6 && (
                  <p className="text-sm text-red-600 dark:text-red-400">Password must be at least 6 characters.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            {passwordStep === 1 ? (
              <Button
                onClick={handleVerifyCurrentPassword}
                disabled={isVerifyingCurrent || !currentPassword.trim()}
              >
                {isVerifyingCurrent ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleUpdateNewPassword}
                disabled={
                  isUpdatingPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
              >
                {isUpdatingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Update Password
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              We will send a password reset link to your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              Enter your password and new email address to update.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="email-password">Current Password</Label>
              <Input
                id="email-password"
                type="password"
                value={emailPassword}
                onChange={(e) => { setEmailPassword(e.target.value); setEmailUpdateError(''); }}
                placeholder="Enter your current password"
              />
            </div>
            <div>
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailUpdateError(''); }}
                placeholder="Enter new email address"
              />
            </div>
            {emailUpdateError && (
              <p className="text-sm text-red-600 dark:text-red-400">{emailUpdateError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChangeEmailOpen(false); setEmailPassword(''); setNewEmail(''); setEmailUpdateError(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmail} disabled={isUpdatingEmail || !emailPassword.trim() || !newEmail.trim()}>
              {isUpdatingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePage;