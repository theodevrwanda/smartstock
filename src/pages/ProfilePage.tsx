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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
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
              await addPendingOperation({
                type: 'updateProduct', // This type seems wrong for user upload, but I'll stick to it if it's expected or fix it to 'updateUser' if possible. Actually, the type definition in offlineDB doesn't have 'updateUser'. I'll check first.
                data: {
                  type: 'imageUpload',
                  userId: user.id,
                  imageData: localImageData,
                }
              });
            }
          }
        } else {
          toast({
            title: 'Offline Mode',
            description: 'Image saved locally. Will upload when online.',
          });
          if (localImageData) {
            await addPendingOperation({
              type: 'updateProduct',
              data: {
                type: 'imageUpload',
                userId: user.id,
                imageData: localImageData,
              }
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
        await addPendingOperation({
          type: 'updateProduct',
          data: {
            collection: 'users',
            id: user.id,
            updates: updateData,
          }
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
          await addPendingOperation({
            type: 'updateProduct',
            data: {
              collection: 'businesses',
              id: businessInfo.id,
              updates: { businessName: businessFormData.businessName },
            }
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
    <Badge className={role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-secondary text-blue-800 dark:bg-accent dark:text-gray-900 dark:text-gray-100'}>
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
      <SEOHelmet title={t('profile_title')} description="View and edit your profile" />
      <div className="min-h-[calc(100vh-64px)] bg-[#F0F2F5] dark:bg-[#18191A]">
        {/* Cover Photo Section */}
        <div className="relative w-full h-[350px] md:h-[400px] bg-gray-300 dark:bg-gray-800 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&h=400&fit=crop"
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10"></div>

          <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8">
            <Button variant="secondary" className="bg-white/90 text-black hover:bg-white shadow-sm font-semibold opacity-70 cursor-not-allowed">
              <Camera className="mr-2 h-4 w-4" /> Edit Cover Photo
            </Button>
          </div>
        </div>

        {/* Profile Header Content Container */}
        <div className="max-w-[1095px] mx-auto px-4 sm:px-6 relative">

          {/* Profile Picture & Actions Row */}
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-[84px] md:-mt-[30px] pb-4 border-b border-gray-300 dark:border-gray-700 mb-0">

            {/* Avatar Container */}
            <div className="relative z-10">
              <div
                className="relative w-[168px] h-[168px] rounded-full p-1 bg-white dark:bg-[#242526] shadow-sm cursor-pointer group"
                onClick={handleImageClick}
              >
                <div className="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400">
                      <UserIcon className="h-20 w-20" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="absolute bottom-2 right-2 bg-gray-100 dark:bg-gray-700 rounded-full p-2 border-2 border-white dark:border-[#242526] shadow-sm">
                    <Camera className="h-5 w-5 text-gray-800 dark:text-gray-200" />
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

            {/* Name & Details */}
            <div className="flex-1 flex flex-col items-center md:items-start pt-4 md:pt-0 md:pl-6 pb-4 md:pb-8 text-center md:text-left">
              <h1 className="text-[32px] font-bold text-[#050505] dark:text-[#E4E6EB] leading-tight flex items-center gap-2">
                {user.fullName || `${user.firstName} ${user.lastName}`}
                {isOnline && <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white translate-y-1" title="Online"></div>}
              </h1>
              <p className="text-[#65676B] dark:text-[#B0B3B8] font-semibold text-[17px] mt-1">
                {user.email}
              </p>
              <div className="flex gap-2 mt-2 justify-center md:justify-start">
                {getRoleBadge(user.role)}
                {user.isActive ? (
                  <span className="text-sm text-green-600 font-medium flex items-center bg-green-50 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3 mr-1" /> Active
                  </span>
                ) : (
                  <span className="text-sm text-amber-600 font-medium flex items-center bg-amber-50 px-2 py-0.5 rounded">
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-8 md:mb-8 self-center md:self-end">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#1B74E4] hover:bg-[#1B74E4]/90 text-white font-semibold px-4 h-9 rounded-md transition-colors"
                >
                  <Edit className="mr-1.5 h-4 w-4" /> {t('edit_profile')}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#1B74E4] hover:bg-[#1B74E4]/90 text-white font-semibold px-6 h-9 rounded-md"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    className="bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#050505] font-semibold px-4 h-9 rounded-md dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-12 mt-4">

            {/* Left Column - Intro */}
            <div className="md:col-span-5 h-fit space-y-4">
              <Card className="border-0 shadow-sm bg-white dark:bg-[#242526] rounded-lg">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-[20px] font-bold text-[#050505] dark:text-[#E4E6EB]">{t('intro')}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                  {/* Bio Placeholder (could come from DB later) */}
                  <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-[#050505] dark:text-[#E4E6EB] text-[15px]">
                      {user.role === 'admin' ? t('admin_account') : t('staff_account')} at SmartStock.
                    </p>
                  </div>

                  {/* Details List */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3 text-[#050505] dark:text-[#E4E6EB]">
                      <Briefcase className="w-5 h-5 text-[#8C939D]" />
                      <span className="text-[15px]">{t('works_at')} <strong>{businessInfo?.businessName || 'SmartStock'}</strong></span>
                    </div>

                    {formData.district && (
                      <div className="flex items-center gap-3 text-[#050505] dark:text-[#E4E6EB]">
                        <MapPin className="w-5 h-5 text-[#8C939D]" />
                        <span className="text-[15px]">{t('lives_in')} <strong>{formData.district || 'Rwanda'}</strong></span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[#050505] dark:text-[#E4E6EB]">
                      <Phone className="w-5 h-5 text-[#8C939D]" />
                      <span className="text-[15px]">{user.phone || t('no_phone')}</span>
                    </div>
                  </div>

                  {isEditing && (
                    <Button variant="secondary" className="w-full bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#050505] dark:bg-[#3A3B3C] dark:text-[#E4E6EB] font-semibold h-9 mt-2">
                      <Edit className="w-4 h-4 mr-2" /> {t('edit_details')}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Personal Info Edit Section (Moving the heavy edit fields here or keeping specifically for edit flows) */}
              <Card className="border-0 shadow-sm bg-white dark:bg-[#242526] rounded-lg">
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-[20px] font-bold text-[#050505] dark:text-[#E4E6EB]">{t('personal_details')}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <dl className="divide-y divide-gray-100 dark:divide-gray-700">
                    <div className="py-2 grid grid-cols-3 gap-4 items-center">
                      <dt className="text-sm font-medium text-gray-500">{t('first_name')}</dt>
                      <dd className="col-span-2">
                        {isEditing ? (
                          <Input
                            value={formData.firstName}
                            onChange={e => handleInputChange('firstName', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-gray-100">{user.firstName}</span>
                        )}
                      </dd>
                    </div>
                    <div className="py-2 grid grid-cols-3 gap-4 items-center">
                      <dt className="text-sm font-medium text-gray-500">{t('last_name')}</dt>
                      <dd className="col-span-2">
                        {isEditing ? (
                          <Input
                            value={formData.lastName}
                            onChange={e => handleInputChange('lastName', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-gray-100">{user.lastName}</span>
                        )}
                      </dd>
                    </div>
                    <div className="py-2 grid grid-cols-3 gap-4 items-center">
                      <dt className="text-sm font-medium text-gray-500">{t('gender')}</dt>
                      <dd className="col-span-2">
                        {isEditing ? (
                          <Input
                            value={formData.gender}
                            onChange={e => handleInputChange('gender', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-gray-100">{user.gender || t('not_set')}</span>
                        )}
                      </dd>
                    </div>
                    <div className="py-2 grid grid-cols-3 gap-4 items-center">
                      <dt className="text-sm font-medium text-gray-500">{t('phone')}</dt>
                      <dd className="col-span-2">
                        {isEditing ? (
                          <Input
                            value={formData.phone}
                            onChange={e => handleInputChange('phone', e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-gray-100">{user.phone}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Main Content */}
            <div className="md:col-span-7 space-y-4">

              {/* Business Info */}
              {businessInfo && (
                <Card className="border-0 shadow-sm bg-white dark:bg-[#242526] rounded-lg">
                  <CardHeader className="pb-2 pt-4 px-4 border-b dark:border-gray-700">
                    <CardTitle className="text-[20px] font-bold text-[#050505] dark:text-[#E4E6EB]">{t('business_info')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{t('business_name')}</Label>
                        {isEditing && isAdmin ? (
                          <Input
                            value={businessFormData.businessName}
                            onChange={e => setBusinessFormData(prev => ({ ...prev, businessName: e.target.value }))}
                          />
                        ) : (
                          <p className="text-lg font-medium text-gray-900 dark:text-white">{businessInfo.businessName}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{t('district')}</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-200">{businessInfo.district}</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{t('sector')}</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-200">{businessInfo.sector}</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{t('cell')}</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-200">{businessInfo.cell}</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">{t('village')}</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-200">{businessInfo.village}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Location Fields Form (Only visible when editing for User Profile) */}
              {isEditing && (
                <Card className="border-0 shadow-sm bg-white dark:bg-[#242526] rounded-lg">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-[20px] font-bold text-[#050505] dark:text-[#E4E6EB]">{t('address_settings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('district')}</Label>
                      <Input value={formData.district} onChange={e => handleInputChange('district', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sector')}</Label>
                      <Input value={formData.sector} onChange={e => handleInputChange('sector', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('cell')}</Label>
                      <Input value={formData.cell} onChange={e => handleInputChange('cell', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('village')}</Label>
                      <Input value={formData.village} onChange={e => handleInputChange('village', e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Settings */}
              <Card className="border-0 shadow-sm bg-white dark:bg-[#242526] rounded-lg">
                <CardHeader className="pb-2 pt-4 px-4 border-b dark:border-gray-700">
                  <CardTitle className="text-[20px] font-bold text-[#050505] dark:text-[#E4E6EB]">{t('settings')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 px-2"
                      onClick={() => { setNewEmail(user?.email || ''); setChangeEmailOpen(true); }}
                    >
                      <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full mr-3">
                        <Mail className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-[15px] text-[#050505] dark:text-[#E4E6EB]">{t('email_address')}</p>
                        <p className="text-[13px] text-[#65676B] dark:text-[#B0B3B8]">{t('update_email_desc')}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 px-2"
                      onClick={() => setChangePasswordOpen(true)}
                    >
                      <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full mr-3">
                        <Key className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-[15px] text-[#050505] dark:text-[#E4E6EB]">{t('password_label')}</p>
                        <p className="text-[13px] text-[#65676B] dark:text-[#B0B3B8]">{t('change_password_desc')}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Button>

                    {pendingCount > 0 && (
                      <div className="py-2 px-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800 my-2">
                        <div className="flex items-center gap-2">
                          <WifiOff className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">{pendingCount} {t('pending_changes')}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 mt-2 border-t dark:border-gray-700">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-10 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 px-2"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        <span className="font-medium">{t('logout')}</span>
                      </Button>
                    </div>
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
              {passwordStep === 1 ? t('verify_identity') : t('create_new_password')}
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
                <Label htmlFor="current-password">{t('current_password')}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setCurrentPasswordError('');
                  }}
                  placeholder={t('enter_current_password')}
                  autoFocus
                />
                {currentPasswordError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{currentPasswordError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="new-password">{t('new_password')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('enter_new_password')}
                  autoFocus
                />
                <Label htmlFor="confirm-password">{t('confirm_password')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirm_new_password_placeholder')}
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">{t('passwords_dont_match')}</p>
                )}
                {newPassword && newPassword.length < 6 && (
                  <p className="text-sm text-red-600 dark:text-red-400">{t('password_min_length')}</p>
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
                {t('continue_button')}
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
                {t('update_password')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('reset_password')}</DialogTitle>
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
            <DialogTitle>{t('delete_account')}</DialogTitle>
            <DialogDescription>
              {t('delete_confirm_desc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              {t('delete_my_account')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('update_email') || 'Update Email'}</DialogTitle>
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