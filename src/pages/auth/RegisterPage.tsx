import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone,
  Building2, Camera, MapPin, ArrowLeft, ArrowRight, Check
} from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { toast } from 'sonner';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import PWAInstallButton from '@/components/PWAInstallButton';

// Step 1 schema: Business & Location info
const step1Schema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  district: z.string().min(1, 'Please enter your district'),
  sector: z.string().min(1, 'Please enter your sector'),
  cell: z.string().min(1, 'Please enter your cell'),
  village: z.string().min(1, 'Please enter your village'),
});

// Step 2 schema: User info
const step2Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  gender: z.string().min(1, 'Please select your gender'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register: registerUser, isAuthenticated, user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, loading]);

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data || undefined,
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const checkBusinessExists = async (businessName: string): Promise<boolean> => {
    const businessRef = collection(db, 'businesses');
    const q = query(businessRef, where('businessName', '==', businessName.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkUserExists = async (field: 'email' | 'phone', value: string): Promise<boolean> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(field, '==', value.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleStep1Submit = async (data: Step1Data) => {
    setIsLoading(true);

    try {
      // Check if business name already exists
      const businessExists = await checkBusinessExists(data.businessName);
      if (businessExists) {
        step1Form.setError('businessName', {
          message: 'This business name is already registered.'
        });
        setIsLoading(false);
        return;
      }

      setStep1Data(data);
      setCurrentStep(2);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (data: Step2Data) => {
    if (!step1Data) {
      toast.error('Please complete step 1 first.');
      return;
    }

    setIsLoading(true);
    step2Form.clearErrors();

    try {
      // Check if email exists
      const emailExists = await checkUserExists('email', data.email);
      if (emailExists) {
        step2Form.setError('email', { message: 'This email is already registered.' });
        setIsLoading(false);
        return;
      }

      // Check if phone exists
      const phoneExists = await checkUserExists('phone', data.phoneNumber);
      if (phoneExists) {
        step2Form.setError('phoneNumber', { message: 'This phone number is already registered.' });
        setIsLoading(false);
        return;
      }

      // Upload image to Cloudinary if selected
      let profileImageUrl: string | undefined = undefined;
      if (selectedFile) {
        try {
          profileImageUrl = await uploadToCloudinary(selectedFile);
        } catch (error) {
          toast.error('Failed to upload profile image.');
          setIsLoading(false);
          return;
        }
      }

      // Register user with all data
      const success = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        district: step1Data.district,
        sector: step1Data.sector,
        cell: step1Data.cell,
        village: step1Data.village,
        phoneNumber: data.phoneNumber,
        businessName: step1Data.businessName,
        profileImage: profileImageUrl,
      });

      if (success) {
        toast.success(
          'Account created successfully! Please wait for central admin to approve your account.',
          { duration: 6000 }
        );
        navigate('/login');
      }
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
        step2Form.setError('email', { message });
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak.';
      } else if (error.message) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setCurrentStep(1);
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            {t('create_account_title')}
          </h1>
          <p className="text-muted-foreground font-medium text-sm">
            {currentStep === 1
              ? t('business_details_step')
              : t('personal_details_step')
            }
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 py-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${currentStep >= 1 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}>
            {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${currentStep > 1 ? 'bg-primary' : 'bg-secondary'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${currentStep >= 2 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
            }`}>
            2
          </div>
        </div>

        {/* Step 1: Business & Location */}
        {currentStep === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-5">
            {/* Profile Image Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border group-hover:border-primary flex items-center justify-center cursor-pointer transition-all overflow-hidden"
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground group-hover:text-foreground" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <p className="text-[10px] text-muted-foreground font-medium text-center mt-2 uppercase tracking-wide">{t('upload_logo')}</p>
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                {t('business_name')}
              </Label>
              <div className="relative">
                <Input
                  id="businessName"
                  placeholder={t('business_name')}
                  className="pl-4 h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step1Form.register('businessName')}
                />
              </div>
              {step1Form.formState.errors.businessName && (
                <p className="text-xs text-red-500 pl-1">{step1Form.formState.errors.businessName.message}</p>
              )}
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label htmlFor="district" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                {t('district')}
              </Label>
              <div className="relative">
                <Input
                  id="district"
                  placeholder={t('district')}
                  className="pl-4 h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step1Form.register('district')}
                />
              </div>
              {step1Form.formState.errors.district && (
                <p className="text-xs text-red-500 pl-1">{step1Form.formState.errors.district.message}</p>
              )}
            </div>

            {/* Sector & Cell */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('sector')}
                </Label>
                <Input
                  id="sector"
                  placeholder={t('sector')}
                  className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step1Form.register('sector')}
                />
                {step1Form.formState.errors.sector && (
                  <p className="text-xs text-red-500 pl-1">{step1Form.formState.errors.sector.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cell" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('cell')}
                </Label>
                <Input
                  id="cell"
                  placeholder={t('cell')}
                  className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step1Form.register('cell')}
                />
                {step1Form.formState.errors.cell && (
                  <p className="text-xs text-red-500 pl-1">{step1Form.formState.errors.cell.message}</p>
                )}
              </div>
            </div>

            {/* Village */}
            <div className="space-y-2">
              <Label htmlFor="village" className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">
                {t('village')}
              </Label>
              <Input
                id="village"
                placeholder={t('village')}
                className="h-11 bg-slate-50 dark:bg-slate-900 border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-[#FCD34D] focus:ring-[#FCD34D]"
                {...step1Form.register('village')}
              />
              {step1Form.formState.errors.village && (
                <p className="text-xs text-red-500 pl-1">{step1Form.formState.errors.village.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#FCD34D] hover:bg-[#fbbf24] text-slate-900 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md mt-4"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t('next_step')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {t('already_have_account')}{' '}
                <Link to="/login" className="font-bold text-foreground hover:underline">
                  {t('sign_in_button')}
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* Step 2: User Information */}
        {currentStep === 2 && (
          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('first_name')}
                </Label>
                <Input
                  id="firstName"
                  placeholder={t('first_name')}
                  className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step2Form.register('firstName')}
                />
                {step2Form.formState.errors.firstName && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('last_name')}
                </Label>
                <Input
                  id="lastName"
                  placeholder={t('last_name')}
                  className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step2Form.register('lastName')}
                />
                {step2Form.formState.errors.lastName && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                {t('email_label')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('email_placeholder')}
                className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                {...step2Form.register('email')}
              />
              {step2Form.formState.errors.email && (
                <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Gender & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">{t('gender')}</Label>
                <Select onValueChange={(value) => step2Form.setValue('gender', value)}>
                  <SelectTrigger className="h-11 bg-background border-border rounded-xl shadow-sm text-foreground focus:ring-primary">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {step2Form.formState.errors.gender && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('phone')}
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder={t('phone_placeholder')}
                  className="h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                  {...step2Form.register('phoneNumber')}
                />
                {step2Form.formState.errors.phoneNumber && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('password_label')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('password_placeholder')}
                    className="pr-8 h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                    {...step2Form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {step2Form.formState.errors.password && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs font-bold uppercase tracking-wider pl-1">
                  {t('confirm_password')}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('password_placeholder')}
                    className="pr-8 h-11 bg-secondary border-transparent hover:bg-secondary/80 transition-colors rounded-xl text-foreground focus:bg-background focus:border-primary focus:ring-primary"
                    {...step2Form.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {step2Form.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 pl-1">{step2Form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isLoading}
                className="flex-[0.4] h-12 border-border bg-transparent hover:bg-secondary text-foreground rounded-2xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back_button')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 bg-[#FCD34D] hover:bg-[#fbbf24] text-slate-900 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('create_account_button')
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {t('already_have_account')}{' '}
                <Link to="/login" className="font-bold text-foreground hover:underline">
                  {t('sign_in_button')}
                </Link>
              </p>
            </div>

            <PWAInstallButton variant="secondary" className="bg-transparent hover:bg-slate-200 text-slate-500 w-full rounded-xl" />
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
