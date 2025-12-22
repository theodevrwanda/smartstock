import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone, 
  Building2, Camera
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

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  gender: z.string().min(1, 'Please select your gender'),
  district: z.string().min(1, 'Please enter your district'),
  sector: z.string().min(1, 'Please enter your sector'),
  cell: z.string().min(1, 'Please enter your cell'),
  village: z.string().min(1, 'Please enter your village'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, setError, clearErrors, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const checkUnique = async (field: 'email' | 'phoneNumber' | 'businessName', value: string): Promise<boolean> => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return true;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(field, '==', trimmedValue));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    clearErrors();

    try {
      // Step 1: Check all three fields for uniqueness in Firestore
      const isEmailUnique = await checkUnique('email', data.email);
      if (!isEmailUnique) {
        setError('email', { message: 'This email is already registered.' });
        setIsLoading(false);
        return;
      }

      const isPhoneUnique = await checkUnique('phoneNumber', data.phoneNumber);
      if (!isPhoneUnique) {
        setError('phoneNumber', { message: 'This phone number is already registered.' });
        setIsLoading(false);
        return;
      }

      const isBusinessUnique = await checkUnique('businessName', data.businessName);
      if (!isBusinessUnique) {
        setError('businessName', { message: 'This business name is already taken.' });
        setIsLoading(false);
        return;
      }

      // Step 2: Only now upload image (if selected)
      let profileImageUrl: string | undefined = undefined;
      if (selectedFile) {
        try {
          profileImageUrl = await uploadToCloudinary(selectedFile);
          toast.success('Profile image uploaded successfully!');
        } catch (error) {
          toast.error('Failed to upload profile image. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Create user in Firebase Auth + save profile to Firestore
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        district: data.district,
        sector: data.sector,
        cell: data.cell,
        village: data.village,
        phoneNumber: data.phoneNumber,
        businessName: data.businessName,
        profileImage: profileImageUrl || undefined,
        role: 'admin',
        isActive: false,
      });

      toast.success('Your account has been created successfully! Please sign in to continue.');
      navigate('/login');
    } catch (error: any) {
      console.error('Registration error:', error);

      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
        setError('email', { message });
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (error.message) {
        message = error.message;
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Sign up
          </h1>
          <p className="text-slate-600">
            Create your account. It's free and only takes a minute.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Profile Image Upload - Preview Only */}
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
              <p className="text-xs text-slate-500 text-center mt-2">Upload photo</p>
            </div>
          </div>

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
                  placeholder="Enter first name"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...register('firstName')}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName.message}</p>
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
                  placeholder="Enter last name"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...register('lastName')}
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Gender & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Gender</Label>
              <Select onValueChange={(value) => setValue('gender', value)}>
                <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-900">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-red-500">{errors.gender.message}</p>
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
                  placeholder="Enter phone number"
                  className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...register('phoneNumber')}
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district" className="text-slate-700 font-medium">
                District
              </Label>
              <Input
                id="district"
                placeholder="Enter district"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('district')}
              />
              {errors.district && (
                <p className="text-xs text-red-500">{errors.district.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-slate-700 font-medium">
                Sector
              </Label>
              <Input
                id="sector"
                placeholder="Enter sector"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('sector')}
              />
              {errors.sector && (
                <p className="text-xs text-red-500">{errors.sector.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cell" className="text-slate-700 font-medium">
                Cell
              </Label>
              <Input
                id="cell"
                placeholder="Enter cell"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('cell')}
              />
              {errors.cell && (
                <p className="text-xs text-red-500">{errors.cell.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="village" className="text-slate-700 font-medium">
                Village
              </Label>
              <Input
                id="village"
                placeholder="Enter village"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('village')}
              />
              {errors.village && (
                <p className="text-xs text-red-500">{errors.village.message}</p>
              )}
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
                placeholder="Enter business name"
                className="pl-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('businessName')}
              />
            </div>
            {errors.businessName && (
              <p className="text-xs text-red-500">{errors.businessName.message}</p>
            )}
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
                  placeholder="Enter password"
                  className="pl-9 pr-9 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
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
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-slate-500">
          <p>
            Developed by{' '}
            <a 
              href="https://theodevrw.netlify.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              RwandaScratch Developer Team
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}