import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone, 
  Building2, MapPin, Upload, Camera
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

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  gender: z.string().min(1, 'Please select your gender'),
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register: registerUser, errorMessage } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      setProfileImage(imageUrl);
      toast.success('Profile image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        sector: data.sector,
        cell: data.cell,
        village: data.village,
        phoneNumber: data.phoneNumber,
        businessName: data.businessName,
        profileImage: profileImage || undefined,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.code === 'auth/email-already-in-use' 
        ? 'This email is already registered' 
        : error.message;
      toast.error(errorMessage);
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
          {/* Profile Image Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
              >
                {uploadingImage ? (
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                ) : profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
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
                  placeholder="John"
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
              <Input
                id="lastName"
                placeholder="Doe"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('lastName')}
              />
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
                placeholder="john@example.com"
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
                  placeholder="+250 xxx xxx xxx"
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sector" className="text-slate-700 font-medium">
                Sector
              </Label>
              <Input
                id="sector"
                placeholder="Sector"
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                {...register('sector')}
              />
              {errors.sector && (
                <p className="text-xs text-red-500">{errors.sector.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cell" className="text-slate-700 font-medium">
                Cell
              </Label>
              <Input
                id="cell"
                placeholder="Cell"
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
                placeholder="Village"
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
                placeholder="Your business name"
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
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-11 bg-white border-slate-200 text-slate-900"
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
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-11 bg-white border-slate-200 text-slate-900"
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
            disabled={isLoading || uploadingImage}
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
            By signing up, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
