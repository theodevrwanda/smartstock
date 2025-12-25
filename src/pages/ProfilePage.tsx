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
  Loader2,
  Key,
  Trash2,
  ArrowRight,
  Check,
  Building2,
  Wifi,
  WifiOff,
  Shield,
  Globe,
  Calendar,
  UserCircle,
  Briefcase,
  ChevronRight,
  Camera,
  Verified,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import SEOHelmet from '@/components/SEOHelmet';
import {
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { addPendingChange } from '@/lib/offlineDB';

interface BusinessInfo {
  id: string;
  businessName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  isActive: boolean;
  businessType: string;
  employeesCount: number;
  lastActive?: string;
}

const ProfilePage: React.FC = () => {
  const { user, logout, loading: authLoading, updateUser } = useAuth();
  const { isOnline, addPendingChange, pendingCount, syncPendingChanges } = useOffline();
  const auth = getAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [localImageData, setLocalImageData] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessFormData, setBusinessFormData] = useState({
    businessName: '',
    businessType: '',
    employeesCount: 0,
  });

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const [passwordStep, setPasswordStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifyingCurrent, setIsVerifyingCurrent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    gender: '',
    bio: '',
    website: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (user?.businessId) {
        try {
          const businessDoc = await getDoc(doc(db, 'businesses', user.businessId));
          if (businessDoc.exists()) {
            const data = businessDoc.data();
            const businessData: BusinessInfo = {
              id: businessDoc.id,
              businessName: data.businessName || '',
              district: data.district || '',
              sector: data.sector || '',
              cell: data.cell || '',
              village: data.village || '',
              businessType: data.businessType || 'Retail',
              employeesCount: data.employeesCount || 0,
              isActive: data.isActive !== false,
              lastActive: data.lastActive || new Date().toISOString(),
            };
            setBusinessInfo(businessData);
            setBusinessFormData({
              businessName: data.businessName || '',
              businessType: data.businessType || 'Retail',
              employeesCount: data.employeesCount || 0,
            });
          }
        } catch (error) {
          console.error('Error fetching business info:', error);
        }
      }
    };

    if (!authLoading && user) {
      Promise.all([fetchBusinessInfo()]).then(() => {
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          district: user.district || '',
          sector: user.sector || '',
          cell: user.cell || '',
          village: user.village || '',
          gender: user.gender || '',
          bio: user.bio || '',
          website: user.website || '',
        });
        setPreviewImage(user.profileImage || '');
        setResetEmail(user.email || '');
        setIsLoading(false);
      });
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
        setLocalImageData(base64Data);
      };
      reader.readAsDataURL(file);
      toast.info(isOnline ? 'Image selected. Will upload when saved.' : 'Image saved locally.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      let newImageUrl = user.profileImage || null;

      if (selectedFile) {
        if (isOnline) {
          toast.loading('Uploading image...');
          try {
            newImageUrl = await uploadToCloudinary(selectedFile);
            toast.success('Image uploaded successfully');
            setLocalImageData(null);
          } catch {
            toast.error('Image upload failed. Saved locally.');
            if (localImageData) {
              await addPendingChange('imageUpload', {
                userId: user.id,
                imageData: localImageData,
              });
            }
          }
        } else {
          toast.info('Offline: Image saved locally. Will upload when online.');
          if (localImageData) {
            await addPendingChange('imageUpload', {
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
        bio: formData.bio,
        website: formData.website,
        profileImage: newImageUrl || localImageData,
        updatedAt: new Date().toISOString(),
      };

      updateUser({
        ...updateData,
        profileImage: localImageData || newImageUrl,
      });

      if (isOnline) {
        await updateDoc(doc(db, 'users', user.id), updateData);
      } else {
        await addPendingChange('updateUser', {
          id: user.id,
          updates: updateData,
        });
      }

      if (isAdmin && businessInfo) {
        const businessUpdateData = {
          businessName: businessFormData.businessName,
          businessType: businessFormData.businessType,
          employeesCount: businessFormData.employeesCount,
        };
        if (isOnline) {
          await updateDoc(doc(db, 'businesses', businessInfo.id), businessUpdateData);
        } else {
          await addPendingChange('updateBusiness', {
            id: businessInfo.id,
            updates: businessUpdateData,
          });
        }
        setBusinessInfo(prev => prev ? { ...prev, ...businessUpdateData } : null);
        updateUser({ businessName: businessFormData.businessName });
      }

      toast.success(isOnline ? 'Profile updated successfully!' : 'Changes saved locally. Will sync when online.');
      setIsEditing(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
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
        gender: user.gender || '',
        bio: user.bio || '',
        website: user.website || '',
      });
      setPreviewImage(user.profileImage || '');
      if (businessInfo) {
        setBusinessFormData({
          businessName: businessInfo.businessName,
          businessType: businessInfo.businessType,
          employeesCount: businessInfo.employeesCount,
        });
      }
    }
    setSelectedFile(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleManualSync = async () => {
    try {
      await syncPendingChanges();
      toast.success('Sync started');
    } catch {
      toast.error('Sync failed');
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Please enter your current password');
      return;
    }
    setIsVerifyingCurrent(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      setPasswordStep(2);
      toast.success('Verified. Now set your new password.');
    } catch (error: any) {
      const message = error.code === 'auth/wrong-password' ? 'Incorrect password' : 'Verification failed';
      setCurrentPasswordError(message);
      toast.error(message);
    } finally {
      setIsVerifyingCurrent(false);
    }
  };

  const handleUpdateNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      toast.success('Password updated successfully!');
      setChangePasswordOpen(false);
      setPasswordStep(1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset email sent');
      setResetPasswordOpen(false);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(auth.currentUser!);
      toast.success('Account deleted');
    } catch (error: any) {
      toast.error(error.code === 'auth/requires-recent-login' ? 'Please sign in again' : 'Failed to delete account');
    }
    setDeleteAccountOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { className: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white', icon: <Shield className="h-3 w-3 mr-1" /> },
      manager: { className: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white', icon: <UserCircle className="h-3 w-3 mr-1" /> },
      staff: { className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white', icon: <Briefcase className="h-3 w-3 mr-1" /> },
    }[role] || config.staff;

    return (
      <Badge className={`${config.className} border-0`}>
        <div className="flex items-center">
          {config.icon}
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </div>
      </Badge>
    );
  };

  const profileCompletion = () => {
    const fields = [user.firstName, user.lastName, user.phone, user.district, user.profileImage, formData.bio];
    const filled = fields.filter(f => f && f.trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 inline-block rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-3">
              <UserCircle className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view your profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHelmet title={`${user.fullName || 'Profile'}`} description="Manage your profile" />

      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-gray-50 via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-900/50 dark:to-gray-950">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Profile
                  </h1>
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Manage your personal information and account settings
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
                >
                  {isEditing ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>

                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="w-full md:w-auto border-2 hover:border-gray-300 dark:hover:border-gray-700"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profile Complete</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">99.9%</p>
                    </div>
                    <Progress value={99} className="h-2 w-24" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Status</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user.isActive ? 'Active' : 'Pending'}
                      </p>
                    </div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? '✓ Active' : '⏳ Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {isOnline ? <Wifi className="h-6 w-6 text-blue-600" /> : <WifiOff className="h-6 w-6 text-orange-600" />}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone Number</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.phone || 'Not set'}</p>
                    </div>
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <UserCircle className="h-6 w-6 text-blue-500" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details and profile picture</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
                    <div className="relative group">
                      <div className="relative w-40 h-40">
                        <Avatar className="w-full h-full border-4 border-white dark:border-gray-800 shadow-2xl">
                          <AvatarImage src={previewImage} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold">
                            {getInitials(user.fullName || `${user.firstName} ${user.lastName}`)}
                          </AvatarFallback>
                        </Avatar>

                        {isEditing && (
                          <>
                            <div
                              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={handleImageClick}
                            >
                              <Camera className="h-10 w-10 text-white" />
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageChange}
                              className="hidden"
                              accept="image/*"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                          {user.fullName || `${user.firstName} ${user.lastName}`}
                        </h2>
                        <Verified className="h-5 w-5 text-blue-500" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {getRoleBadge(user.role || 'staff')}
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? 'Active' : 'Pending Approval'}
                        </Badge>
                        {businessInfo?.businessType && (
                          <Badge variant="outline">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {businessInfo.businessType}
                          </Badge>
                        )}
                      </div>

                      {formData.bio && (
                        <p className="text-gray-700 dark:text-gray-300 italic border-l-4 border-blue-500 pl-4 py-2">
                          "{formData.bio}"
                        </p>
                      )}
                    </div>
                  </div>

                  <Tabs defaultValue="personal" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="personal">Personal Details</TabsTrigger>
                      <TabsTrigger value="additional">Additional Info</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="first-name" className="font-semibold">First Name</Label>
                          {isEditing ? (
                            <Input
                              id="first-name"
                              value={formData.firstName}
                              onChange={e => handleInputChange('firstName', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.firstName || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="last-name" className="font-semibold">Last Name</Label>
                          {isEditing ? (
                            <Input
                              id="last-name"
                              value={formData.lastName}
                              onChange={e => handleInputChange('lastName', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.lastName || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="gender" className="font-semibold">Gender</Label>
                          {isEditing ? (
                            <Select value={formData.gender} onValueChange={v => handleInputChange('gender', v)}>
                              <SelectTrigger className="border-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.gender || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="phone" className="font-semibold flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </Label>
                          {isEditing ? (
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={e => handleInputChange('phone', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              {user.phone || 'Not set'}
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="additional" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="district" className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            District
                          </Label>
                          {isEditing ? (
                            <Input
                              id="district"
                              value={formData.district}
                              onChange={e => handleInputChange('district', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.district || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="sector" className="font-semibold">Sector</Label>
                          {isEditing ? (
                            <Input
                              id="sector"
                              value={formData.sector}
                              onChange={e => handleInputChange('sector', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.sector || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="cell" className="font-semibold">Cell</Label>
                          {isEditing ? (
                            <Input
                              id="cell"
                              value={formData.cell}
                              onChange={e => handleInputChange('cell', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.cell || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="village" className="font-semibold">Village</Label>
                          {isEditing ? (
                            <Input
                              id="village"
                              value={formData.village}
                              onChange={e => handleInputChange('village', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                              {user.village || 'Not set'}
                            </p>
                          )}
                        </div>

                        <div className="md:col-span-2 space-y-3">
                          <Label htmlFor="bio" className="font-semibold">Bio</Label>
                          {isEditing ? (
                            <Input
                              id="bio"
                              value={formData.bio}
                              onChange={e => handleInputChange('bio', e.target.value)}
                              className="border-2 focus:border-blue-500"
                            />
                          ) : (
                            <p className="text-gray-700 dark:text-gray-300">
                              {formData.bio || 'No bio added yet.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {businessInfo && (
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-amber-50/50 dark:from-gray-800 dark:via-gray-800/50 dark:to-amber-900/20 backdrop-blur-sm">
                  <CardHeader className="border-b border-amber-200 dark:border-amber-800/50">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Building2 className="h-6 w-6 text-amber-600" />
                      Business Information
                    </CardTitle>
                    <CardDescription>{isAdmin ? 'Manage your business details' : 'View business information'}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-semibold">Business Name</Label>
                        {isEditing && isAdmin ? (
                          <Input
                            value={businessFormData.businessName}
                            onChange={e => setBusinessFormData(prev => ({ ...prev, businessName: e.target.value }))}
                            className="border-2 focus:border-amber-500"
                          />
                        ) : (
                          <p className="text-lg font-medium text-gray-900 dark:text-white">{businessInfo.businessName}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label className="font-semibold">Business Type</Label>
                        {isEditing && isAdmin ? (
                          <Select
                            value={businessFormData.businessType}
                            onValueChange={v => setBusinessFormData(prev => ({ ...prev, businessType: v }))}
                          >
                            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Wholesale">Wholesale</SelectItem>
                              <SelectItem value="Service">Service</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-lg font-medium text-gray-900 dark:text-white">{businessInfo.businessType}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label className="font-semibold">Employees</Label>
                        {isEditing && isAdmin ? (
                          <Input
                            type="number"
                            value={businessFormData.employeesCount}
                            onChange={e => setBusinessFormData(prev => ({ ...prev, employeesCount: parseInt(e.target.value) || 0 }))}
                            className="border-2 focus:border-amber-500"
                          />
                        ) : (
                          <p className="text-lg font-medium text-gray-900 dark:text-white">{businessInfo.employeesCount} employees</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-8">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-lg ${
                    isOnline
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50'
                  }`}>
                    <div>
                      <p className="font-bold text-lg">{isOnline ? 'Online' : 'Offline'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isOnline ? 'Connected to cloud' : 'Working offline - changes sync when online'}
                      </p>
                    </div>
                    {isOnline ? <Wifi className="h-8 w-8 text-green-600" /> : <WifiOff className="h-8 w-8 text-orange-600" />}
                  </div>

                  {pendingCount > 0 && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Changes</span>
                          <span className="font-bold">{pendingCount}</span>
                        </div>
                        <Progress value={pendingCount * 10} className="h-2" />
                      </div>
                      <Button
                        onClick={handleManualSync}
                        disabled={!isOnline}
                        variant="outline"
                        className="w-full"
                      >
                        Sync Now
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security & Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-between" onClick={() => setChangePasswordOpen(true)}>
                    <div className="flex items-center gap-2"><Key className="h-4 w-4" /> Change Password</div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between" onClick={() => setResetPasswordOpen(true)}>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Reset via Email</div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Separator className="my-2" />
                  <Button variant="outline" className="w-full justify-between" onClick={handleLogout}>
                    <div className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Sign Out</div>
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => setDeleteAccountOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Dialogs remain unchanged except using Sonner toast */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {passwordStep === 1 ? 'Verify Your Identity' : 'Create New Password'}
              </DialogTitle>
            </DialogHeader>
            {passwordStep === 1 ? (
              <div className="space-y-4">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); setCurrentPasswordError(''); }}
                  />
                  <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {currentPasswordError && <p className="text-sm text-red-600">{currentPasswordError}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
              {passwordStep === 1 ? (
                <Button onClick={handleVerifyCurrentPassword} disabled={isVerifyingCurrent}>
                  {isVerifyingCurrent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setPasswordStep(1)}>Back</Button>
                  <Button onClick={handleUpdateNewPassword} disabled={isUpdatingPassword || newPassword.length < 8 || newPassword !== confirmPassword}>
                    {isUpdatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Update
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
            <Label>Email Address</Label>
            <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
              <Button onClick={handleResetPassword}>Send Reset Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-red-600">Delete Account</DialogTitle></DialogHeader>
            <DialogDescription>This action is permanent and cannot be undone.</DialogDescription>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAccountOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ProfilePage;