import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../../utils/auth-context";
import { toast } from "sonner@2.0.3";
import { ScreenLayout } from "../ui/screen-layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

interface ProfileEditProps {
  onNavigate: (screen: string) => void;
}

export function ProfileEdit({ onNavigate }: ProfileEditProps) {
  const { user, updatePassword, signOut } = useAuth();
  
  // Email state
  const [email, setEmail] = useState(user?.email || '');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Sign out dialog
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePasswordForm = () => {
    const errors: typeof passwordErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    if (email === user?.email) {
      toast.info('Email is already up to date');
      return;
    }

    setEmailLoading(true);
    try {
      // Note: Email update functionality requires additional Supabase setup
      toast.info('Email update coming soon. This feature requires email verification setup.');
      // TODO: Implement with supabase.auth.updateUser({ email: email })
    } catch (error) {
      console.error('Email update error:', error);
      toast.error('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <ScreenLayout 
      title="Profile" 
      onBack={() => onNavigate('settings')}
      showNavSpacing={true}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-8">
          {/* User Info Card */}
          <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User size={28} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="trades-body font-semibold truncate" style={{ color: '#111827' }}>
                    {user?.name || 'User'}
                  </p>
                </div>
                <p className="trades-caption truncate" style={{ color: '#6B7280' }}>
                  Member since {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          {/* Change Email Section */}
          <div>
            <h2 className="trades-h2 mb-3 px-1" style={{ color: '#111827' }}>Email Address</h2>
            
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E5E7EB' }}>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
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
                        if (emailError) setEmailError('');
                      }}
                      placeholder="your@email.com"
                      className="pl-11 h-12 trades-body"
                      disabled={emailLoading}
                      aria-invalid={!!emailError}
                    />
                  </div>
                  {emailError && (
                    <p className="trades-caption text-red-600 mt-1">{emailError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Mail size={16} className="text-blue-600 flex-shrink-0" />
                  <p className="trades-caption text-blue-900" style={{ lineHeight: '1.5' }}>
                    Changing your email will require verification via email link
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl"
                  disabled={emailLoading || email === user?.email}
                >
                  {emailLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Email'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Change Password Section */}
          <div>
            <h2 className="trades-h2 mb-3 px-1" style={{ color: '#111827' }}>Change Password</h2>
            
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: '#E5E7EB' }}>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="trades-label text-gray-900 block mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock 
                      size={20} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordErrors.currentPassword) {
                          setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                        }
                      }}
                      placeholder="Enter current password"
                      className="pl-11 pr-11 h-12 trades-body"
                      disabled={passwordLoading}
                      aria-invalid={!!passwordErrors.currentPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={passwordLoading}
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="trades-caption text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="trades-label text-gray-900 block mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock 
                      size={20} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordErrors.newPassword) {
                          setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                        }
                      }}
                      placeholder="Enter new password"
                      className="pl-11 pr-11 h-12 trades-body"
                      disabled={passwordLoading}
                      aria-invalid={!!passwordErrors.newPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={passwordLoading}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="trades-caption text-red-600 mt-1">{passwordErrors.newPassword}</p>
                  )}
                  {!passwordErrors.newPassword && newPassword && (
                    <p className="trades-caption text-gray-500 mt-1">
                      8+ characters with uppercase, lowercase, and number
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="trades-label text-gray-900 block mb-2">
                    Confirm New Password
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
                        if (passwordErrors.confirmPassword) {
                          setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                        }
                      }}
                      placeholder="Re-enter new password"
                      className="pl-11 pr-11 h-12 trades-body"
                      disabled={passwordLoading}
                      aria-invalid={!!passwordErrors.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={passwordLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="trades-caption text-red-600 mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Lock size={16} className="text-blue-600 flex-shrink-0" />
                  <p className="trades-caption text-blue-900" style={{ lineHeight: '1.5' }}>
                    Make sure your password is strong and unique
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="trades-label font-semibold text-green-900 mb-1">
                Your account is secure
              </p>
              <p className="trades-caption text-green-800" style={{ lineHeight: '1.5' }}>
                Your password is encrypted and secure. We recommend changing it every 3-6 months.
              </p>
            </div>
          </div>

          {/* Sign Out Section */}
          <div style={{ marginBottom: '24px' }}>
            <h2 className="trades-h2 mb-4 px-1" style={{ color: '#111827' }}>Account Actions</h2>
            
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowSignOutDialog(true)}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100">
                  <LogOut size={20} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="trades-body font-medium text-red-600">Sign Out</p>
                  <p className="trades-caption text-red-500">
                    End your session and return to login
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreenLayout>
  );
}
