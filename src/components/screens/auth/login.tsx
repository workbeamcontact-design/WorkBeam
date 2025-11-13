import { ArrowLeft, Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { useAuth } from "../../../utils/auth-context";
import { toast } from "sonner@2.0.3";
import { WorkBeamLogo } from "../../ui/workbeam-logo";

interface LoginProps {
  onBack: () => void;
  onNavigate: (screen: 'signup' | 'forgot-password') => void;
}

export function Login({ onBack, onNavigate }: LoginProps) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string>('');

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous login errors
    setLoginError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        toast.success('Welcome back!');
      } else {
        // Set user-friendly error message
        const errorMessage = result.error?.toLowerCase().includes('invalid') || 
                            result.error?.toLowerCase().includes('credentials') ||
                            result.error?.toLowerCase().includes('password')
          ? 'The email or password you entered is incorrect. Please try again.'
          : result.error || 'Failed to sign in';
        setLoginError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setLoginError(errorMessage);
      toast.error(errorMessage);
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
      // Success will be handled by auth state change
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
          <h1 className="trades-h1" style={{ color: '#111827' }}>Sign In</h1>
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
            Welcome back! Sign in to access your trades business dashboard.
          </p>

          {/* Login Error Banner */}
          {loginError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="trades-label text-red-900 mb-1">Sign In Failed</p>
                <p className="trades-caption text-red-700">{loginError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                    if (loginError) setLoginError('');
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
                    if (loginError) setLoginError('');
                  }}
                  placeholder="Enter your password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="trades-label text-primary hover:underline"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="trades-caption text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Google Sign In */}
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

          {/* Sign Up Link */}
          <div className="mt-6 mb-8 text-center">
            <p className="trades-body" style={{ color: '#6B7280' }}>
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="trades-body font-semibold text-primary hover:underline"
                disabled={loading}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
