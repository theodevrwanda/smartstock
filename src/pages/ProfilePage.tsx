import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  ToggleLeft,
  ToggleRight,
  Loader2,
  Key,
  Trash2,
  ArrowRight,
  Check,
  Building2,
  WifiOff,
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
  verifyBeforeUpdateEmail,
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
  const { user, logout, loading: authLoading, updateUser, updateUserAndSync } = useAuth();
  const { isOnline, addPendingChange, pendingCount } = useOffline();
  const auth = getAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [localImageData, setLocalImageData] = useState<string | null>(null);

  // Business info state
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessFormData, setBusinessFormData] = useState({
    businessName: '',
  });

  // Dialogs
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);

  // Multi-step Change Password
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifyingCurrent, setIsVerifyingCurrent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');

  // Reset email
  const [resetEmail, setResetEmail] = useState('');
  
  // Email update states
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

  // Fetch business info
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
            setBusinessFormData({
              businessName: data.businessName || '',
            });
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
        setLocalImageData(base64Data); // Store for offline use
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

      // Handle image upload
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
            // Queue image for later upload
            if (localImageData) {
              await addPendingChange('updateProduct', {
                type: 'imageUpload',
                userId: user.id,
                imageData: localImageData,
              });
            }
          }
        } else {
          // Offline: store image locally and queue for upload
          toast({
            title: 'Offline Mode',
            description: 'Image saved locally. Will upload when online.',
          });
          if (localImageData) {
            await addPendingChange('updateProduct', {
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

      // Immediately update local auth state for instant UI feedback
      updateUser({
        ...updateData,
        // Use local preview if we have it
        profileImage: localImageData || newImageUrl,
        imagephoto: localImageData || newImageUrl,
      });

      if (isOnline) {
        // Online: save to Firestore directly
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { ...updateData, updatedAt: new Date().toISOString() });
      } else {
        // Offline: queue for sync
        await addPendingChange('updateProduct', {
          collection: 'users',
          id: user.id,
          updates: updateData,
        });
      }

      // Only admin can update business name
      if (isAdmin && businessInfo && businessFormData.businessName !== businessInfo.businessName) {
        if (isOnline) {
          const businessRef = doc(db, 'businesses', businessInfo.id);
          await updateDoc(businessRef, { 
            businessName: businessFormData.businessName,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await addPendingChange('updateProduct', {
            collection: 'businesses',
            id: businessInfo.id,
            updates: { businessName: businessFormData.businessName },
          });
        }
        setBusinessInfo(prev => prev ? { ...prev, businessName: businessFormData.businessName } : null);
        // Update auth state with new business name
        updateUser({ businessName: businessFormData.businessName });
      }

      toast({ 
        title: 'Success', 
        description: isOnline 
          ? 'Profile updated successfully!' 
          : 'Profile updated locally. Will sync when online.' 
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

  // Removed manual offline toggle - now using OfflineContext

  // Step 1: Verify current password
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

  // Step 2: Update password
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

  // Reset password email
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

  // Delete account
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

  // Update email
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
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(auth.currentUser.email, emailPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update email in Firebase Auth
      await updateEmail(auth.currentUser, newEmail);

      // Update email in Firestore
      if (user) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { email: newEmail, updatedAt: new Date().toISOString() });
        
        // Update local state
        updateUser({ email: newEmail });
      }

      toast({ title: 'Success', description: 'Email updated successfully!' });
      setChangeEmailOpen(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      let message = 'Failed to update email.';
      if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please log out and log in again before changing email.';
      }
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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
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

  return (
    <>
      <SEOHelmet title="My Profile" description="View and edit your profile" />
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your personal information and account settings</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div
                  className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer hover:opacity-90 transition"
                  onClick={handleImageClick}
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Edit className="h-8 w-8 text-white" />
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
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.fullName || `${user.firstName} ${user.lastName}`}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                  <div className="flex gap-2 mt-3">
                    {getRoleBadge(user.role)}
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? 'Active' : 'Pending Approval'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>First Name</Label>
                  {isEditing ? (
                    <Input value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.firstName || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Last Name</Label>
                  {isEditing ? (
                    <Input value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.lastName || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Full Name</Label>
                  <p className="mt-2 text-gray-900 dark:text-white">{user.fullName || 'Not set'}</p>
                </div>
                <div>
                  <Label>Gender</Label>
                  {isEditing ? (
                    <Input value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.gender || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-white">{user.email}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { setNewEmail(user.email || ''); setChangeEmailOpen(true); }}
                      className="ml-2"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Change
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Phone Number</Label>
                  {isEditing ? (
                    <Input value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {user.phone || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>District</Label>
                  {isEditing ? (
                    <Input value={formData.district} onChange={e => handleInputChange('district', e.target.value)} />
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {user.district || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Sector</Label>
                  {isEditing ? (
                    <Input value={formData.sector} onChange={e => handleInputChange('sector', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.sector || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Cell</Label>
                  {isEditing ? (
                    <Input value={formData.cell} onChange={e => handleInputChange('cell', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.cell || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label>Village</Label>
                  {isEditing ? (
                    <Input value={formData.village} onChange={e => handleInputChange('village', e.target.value)} />
                  ) : (
                    <p className="mt-2 text-gray-900 dark:text-white">{user.village || 'Not set'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information Card */}
          {businessInfo && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Business Name {!isAdmin && '(Admin only can edit)'}</Label>
                    {isEditing && isAdmin ? (
                      <Input 
                        value={businessFormData.businessName} 
                        onChange={e => setBusinessFormData(prev => ({ ...prev, businessName: e.target.value }))} 
                        placeholder="Enter business name"
                      />
                    ) : (
                      <p className="mt-2 text-gray-900 dark:text-white font-medium">
                        {businessInfo.businessName || 'Not set'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>District</Label>
                    <p className="mt-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {businessInfo.district || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label>Sector</Label>
                    <p className="mt-2 text-gray-900 dark:text-white">{businessInfo.sector || 'Not set'}</p>
                  </div>
                  <div>
                    <Label>Cell</Label>
                    <p className="mt-2 text-gray-900 dark:text-white">{businessInfo.cell || 'Not set'}</p>
                  </div>
                  <div>
                    <Label>Village</Label>
                    <p className="mt-2 text-gray-900 dark:text-white">{businessInfo.village || 'Not set'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Business Status</Label>
                    <div className="mt-2">
                      <Badge variant={businessInfo.isActive ? "default" : "secondary"}>
                        {businessInfo.isActive ? 'Active' : 'Pending Approval'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Sidebar */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{isOnline ? 'Online' : 'Offline'}</p>
                    <p className="text-sm text-gray-500">
                      {isOnline ? 'Connected to cloud' : 'Working offline - changes sync when online'}
                    </p>
                  </div>
                  <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center gap-1">
                    {isOnline ? 'Online' : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>
                {pendingCount > 0 && (
                  <p className="text-sm text-amber-600 mt-3">
                    {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => { setNewEmail(user?.email || ''); setChangeEmailOpen(true); }}>
                  <Mail className="mr-2 h-4 w-4" /> Change Email
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setChangePasswordOpen(true)}>
                  <Key className="mr-2 h-4 w-4" /> Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setResetPasswordOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" /> Reset via Email
                </Button>
                <Button variant="destructive" className="w-full justify-start" onClick={() => setDeleteAccountOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Multi-Step Change Password Dialog */}
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

        {/* Reset Password via Email Dialog */}
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

        {/* Delete Account Confirmation Dialog */}
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
      </div>
    </>
  );
};

export default ProfilePage;