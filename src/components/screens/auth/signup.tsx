import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { useAuth } from "../../../utils/auth-context";
import { toast } from "sonner@2.0.3";
import { WorkBeamLogo } from "../../ui/workbeam-logo";

interface SignupProps {
  onBack: () => void;
  onNavigate: (screen: 'login') => void;
}

export function Signup({ onBack, onNavigate }: SignupProps) {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, name);
      
      if (result.success) {
        toast.success('Account created successfully!');
      } else {
        toast.error(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (!result.success) {
        toast.error(result.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-white overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
            disabled={loading}
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="trades-h1" style={{ color: '#111827' }}>Create Account</h1>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <WorkBeamLogo variant="light" width={180} />
          </div>

          <p className="trades-body mb-6" style={{ color: '#6B7280' }}>
            Join thousands of tradesmen managing their business with WorkBeam.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="trades-label text-gray-900 block mb-2">
                Full Name
              </label>
              <div className="relative">
                <User 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  placeholder="John Smith"
                  className="pl-11 h-12 trades-body"
                  disabled={loading}
                  aria-invalid={!!errors.name}
                />
              </div>
              {errors.name && (
                <p className="trades-caption text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label className="trades-label text-gray-900 block mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  placeholder="your@email.com"
                  className="pl-11 h-12 trades-body"
                  disabled={loading}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="trades-caption text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="trades-label text-gray-900 block mb-2">
                Password
              </label>
              <div className="relative">
                <Lock 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder="Create a strong password"
                  className="pl-11 pr-11 h-12 trades-body"
                  disabled={loading}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="trades-caption text-red-600 mt-1">{errors.password}</p>
              )}
              {!errors.password && password && (
                <p className="trades-caption text-gray-500 mt-1">
                  8+ characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="trades-label text-gray-900 block mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock 
                  size={20} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="Re-enter your password"
                  className="pl-11 pr-11 h-12 trades-body"
                  disabled={loading}
                  aria-invalid={!!errors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="trades-caption text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="trades-caption text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Google Sign Up */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full h-14 border-2 rounded-xl gap-3"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
              <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
              <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="trades-body" style={{ color: '#6B7280' }}>
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="trades-body font-semibold text-primary hover:underline"
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Terms Notice */}
          <p className="trades-caption text-center mt-4 mb-8" style={{ color: '#9CA3AF', lineHeight: '1.5' }}>
            By creating an account, you agree to our{' '}
            <span className="text-primary">Terms of Service</span> and{' '}
            <span className="text-primary">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
