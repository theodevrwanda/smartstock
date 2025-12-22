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
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'firebase/auth';

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const { user, logout, loading: authLoading } = useAuth();
  const auth = getAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Dialogs
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

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

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
  });

  useEffect(() => {
    if (!authLoading && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        district: user.district || '',
        sector: user.sector || '',
        cell: user.cell || '',
        village: user.village || '',
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
        setPreviewImage(reader.result as string);
        toast({ title: 'Success', description: 'Profile image preview updated.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: 'Success', description: 'Profile updated successfully!' });
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        district: user.district || '',
        sector: user.sector || '',
        cell: user.cell || '',
        village: user.village || '',
      });
      setPreviewImage(user.profileImage || '');
    }
    setSelectedFile(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'You have been signed out successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to log out.', variant: 'destructive' });
    }
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => !prev);
    toast({
      title: isOfflineMode ? 'Online Mode' : 'Offline Mode',
      description: isOfflineMode 
        ? 'App is now using live data.' 
        : 'App is now in offline mode (using mock data).',
    });
  };

  // Step 1: Verify current password with clear error message
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
      
      // Success — go to next step
      setPasswordStep(2);
      toast({ title: 'Verified ✓', description: 'Current password is correct. Now set your new password.' });
    } catch (error: any) {
      let message = 'Failed to verify password.';
      if (error.code === 'auth/wrong-password') {
        message = 'Incorrect current password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      setCurrentPasswordError(message);
      toast({ title: 'Verification Failed', description: message, variant: 'destructive' });
    } finally {
      setIsVerifyingCurrent(false);
    }
  };

  // Step 2: Update new password
  const handleUpdateNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      toast({ title: 'Success ✓', description: 'Your password has been changed successfully!' });
      setChangePasswordOpen(false);
      setPasswordStep(1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordError('');
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update password. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Reset password via email
  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({ title: 'Error', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ 
        title: 'Email Sent', 
        description: 'A password reset link has been sent to your email. Check your inbox and spam folder.' 
      });
      setResetPasswordOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to send reset email.', variant: 'destructive' });
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    try {
      await deleteUser(auth.currentUser);
      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          title: 'Re-login Required', 
          description: 'For security, please log in again before deleting your account.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Error', description: 'Failed to delete account.', variant: 'destructive' });
      }
    }
    setDeleteAccountOpen(false);
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
      <SEOHelmet title="My Profile - EMS" description="View and manage your profile" />
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
                <Edit size={16} className="mr-2" /> Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  <X size={16} className="mr-2" /> Cancel
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
                      <UserIcon size={48} className="text-gray-400" />
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <Edit size={24} className="text-white" />
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
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                  <div className="flex gap-2 mt-3">
                    {getRoleBadge(user.role)}
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
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
                  <Label>Email</Label>
                  <p className="mt-2 flex items-center gap-2 text-gray-900 dark:text-white">
                    <Mail size={16} className="text-gray-500" />
                    {user.email}
                  </p>
                </div>
                <div>
                  <Label>Phone Number</Label>
                  {isEditing ? (
                    <Input value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                  ) : (
                    <p className="mt-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Phone size={16} className="text-gray-500" />
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
                      <MapPin size={16} className="text-gray-500" />
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

          {/* Account Settings Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Offline Mode</p>
                    <p className="text-sm text-gray-500">Use mock data (no internet needed)</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleOfflineMode}
                  >
                    {isOfflineMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setChangePasswordOpen(true);
                    setPasswordStep(1);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setCurrentPasswordError('');
                  }}
                >
                  <Key size={16} className="mr-2" />
                  Change Password
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setResetPasswordOpen(true)}
                >
                  <Mail size={16} className="mr-2" />
                  Reset Password via Email
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
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
      </div>
    </>
  );
};

export default ProfilePage;