import React, { useState, useRef } from 'react';
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
import { uploadToCloudinary } from '@/lib/uploadToCloudinary';
import { toast } from 'sonner';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase';

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
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

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
      toast.error('Error checking business name. Please try again.');
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
          toast.error('Failed to upload profile image. Please try again.');
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
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-slate-600">
            {currentStep === 1 
              ? 'Enter your business details to get started.'
              : 'Complete your personal information.'
            }
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`flex-1 h-1 rounded ${currentStep > 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            2
          </div>
        </div>

        {/* Step 1: Business & Location */}
        {currentStep === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-5">
            {/* Profile Image Upload */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <p className="text-xs text-slate-500 text-center mt-2">Upload Logo/Photo</p>
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-slate-700 font-medium">
                Business Name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="businessName"
                  placeholder="Enter your business name"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...step1Form.register('businessName')}
                />
              </div>
              {step1Form.formState.errors.businessName && (
                <p className="text-xs text-red-500">{step1Form.formState.errors.businessName.message}</p>
              )}
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label htmlFor="district" className="text-slate-700 font-medium">
                District
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="district"
                  placeholder="Enter district"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...step1Form.register('district')}
                />
              </div>
              {step1Form.formState.errors.district && (
                <p className="text-xs text-red-500">{step1Form.formState.errors.district.message}</p>
              )}
            </div>

            {/* Sector & Cell */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector" className="text-slate-700 font-medium">
                  Sector
                </Label>
                <Input
                  id="sector"
                  placeholder="Enter sector"
                  className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...step1Form.register('sector')}
                />
                {step1Form.formState.errors.sector && (
                  <p className="text-xs text-red-500">{step1Form.formState.errors.sector.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cell" className="text-slate-700 font-medium">
                  Cell
                </Label>
                <Input
                  id="cell"
                  placeholder="Enter cell"
                  className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...step1Form.register('cell')}
                />
                {step1Form.formState.errors.cell && (
                  <p className="text-xs text-red-500">{step1Form.formState.errors.cell.message}</p>
                )}
              </div>
            </div>

            {/* Village */}
            <div className="space-y-2">
              <Label htmlFor="village" className="text-slate-700 font-medium">
                Village
              </Label>
              <Input
                id="village"
                placeholder="Enter village"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...step1Form.register('village')}
              />
              {step1Form.formState.errors.village && (
                <p className="text-xs text-red-500">{step1Form.formState.errors.village.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                  Sign in
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
                <Label htmlFor="firstName" className="text-slate-700 font-medium">
                  First Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="firstName"
                    placeholder="First name"
                    className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    {...step2Form.register('firstName')}
                  />
                </div>
                {step2Form.formState.errors.firstName && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-700 font-medium">
                  Last Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    {...step2Form.register('lastName')}
                  />
                </div>
                {step2Form.formState.errors.lastName && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...step2Form.register('email')}
                />
              </div>
              {step2Form.formState.errors.email && (
                <p className="text-xs text-red-500">{step2Form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Gender & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Gender</Label>
                <Select onValueChange={(value) => step2Form.setValue('gender', value)}>
                  <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {step2Form.formState.errors.gender && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phoneNumber"
                    placeholder="07X XXX XXXX"
                    className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    {...step2Form.register('phoneNumber')}
                  />
                </div>
                {step2Form.formState.errors.phoneNumber && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create password"
                    className="pl-9 pr-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    {...step2Form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {step2Form.formState.errors.password && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    className="pl-9 pr-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    {...step2Form.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {step2Form.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500">{step2Form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isLoading}
                className="flex-1 h-12 border-slate-300"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
