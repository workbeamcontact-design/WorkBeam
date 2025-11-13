import { ArrowLeft, Mail, CheckCircle, Loader2, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { WorkBeamLogo } from "../../ui/workbeam-logo";

interface ForgotPasswordProps {
  onBack: () => void;
}

type Step = 'email' | 'verify-code' | 'new-password' | 'success';

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleRequestOTP = async (isResend = false) => {
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/auth/request-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(isResend ? 'New verification code sent!' : 'Verification code sent to your email');
        setStep('verify-code');
        setResendCooldown(60); // 60 second cooldown
        // Focus first input
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      } else {
        const errorMsg = result.error || 'Failed to send verification code';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);
    
    // Focus last filled input or first empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs[nextIndex].current?.focus();
  };

  const handleVerifyCode = async () => {
    const codeString = code.join('');
    
    if (codeString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/auth/verify-reset-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, code: codeString })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Code verified!');
        setStep('new-password');
      } else {
        const errorMsg = result.error || 'Invalid verification code';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Verify code error:', error);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            email, 
            code: code.join(''), 
            newPassword 
          })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Password reset successfully!');
        setStep('success');
      } else {
        const errorMsg = result.error || 'Failed to reset password';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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
            onClick={() => {
              if (step === 'email') {
                onBack();
              } else {
                // Go back one step
                if (step === 'verify-code') setStep('email');
                if (step === 'new-password') setStep('verify-code');
              }
            }}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
            disabled={loading}
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="trades-h1" style={{ color: '#111827' }}>
            Reset Password
          </h1>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-8">
          {/* Logo - Show only on email step */}
          {step === 'email' && (
            <div className="flex justify-center mb-6">
              <WorkBeamLogo variant="light" width={180} />
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === 'email' && (
            <>
              <p className="trades-body mb-6" style={{ color: '#6B7280' }}>
                Enter your email address and we'll send you a 6-digit verification code to reset your password.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleRequestOTP(); }} className="space-y-4">
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
                        if (error) setError('');
                      }}
                      placeholder="your@email.com"
                      className="pl-11 h-12 trades-body"
                      disabled={loading}
                      aria-invalid={!!error}
                    />
                  </div>
                  {error && (
                    <p className="trades-caption text-red-600 mt-1">{error}</p>
                  )}
                </div>

                {/* Send Code Button */}
                <Button
                  type="submit"
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="trades-caption text-blue-900" style={{ lineHeight: '1.5' }}>
                  <strong>What happens next?</strong><br />
                  You'll receive a 6-digit code via email. The code expires in 10 minutes.
                </p>
              </div>
            </>
          )}

          {/* Step 2: Verify Code */}
          {step === 'verify-code' && (
            <>
              <p className="trades-body mb-2" style={{ color: '#6B7280' }}>
                We've sent a 6-digit verification code to:
              </p>
              <p className="trades-body font-semibold mb-6" style={{ color: '#111827' }}>
                {email}
              </p>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="trades-caption text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* OTP Input */}
              <div className="mb-6">
                <label className="trades-label text-gray-900 block mb-3">
                  Verification Code
                </label>
                <div className="flex gap-2 justify-center">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-12 h-14 text-center trades-h2 border-2 border-gray-300 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerifyCode}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl mb-4"
                disabled={loading || code.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              {/* Resend Code */}
              <div className="text-center">
                <p className="trades-caption text-gray-600 mb-2">
                  Didn't receive the code?
                </p>
                <button
                  onClick={() => handleRequestOTP(true)}
                  disabled={loading || resendCooldown > 0}
                  className="trades-label text-primary hover:underline disabled:text-gray-400 disabled:no-underline flex items-center gap-2 mx-auto"
                >
                  <RefreshCw size={16} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              {/* Info Banner */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="trades-caption text-blue-900" style={{ lineHeight: '1.5' }}>
                  <strong>Security tip:</strong> The code expires in 10 minutes. Check your spam folder if you don't see the email.
                </p>
              </div>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 'new-password' && (
            <>
              <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <p className="trades-caption text-green-900">
                  Code verified! Now create your new password.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="trades-caption text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
                {/* New Password Input */}
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
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Enter new password (min. 8 characters)"
                      className="pl-11 pr-11 h-12 trades-body"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={loading}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <p className="trades-caption text-gray-500 mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>

                {/* Reset Password Button */}
                <Button
                  type="submit"
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              
              <h2 className="trades-h2 mb-2" style={{ color: '#111827' }}>
                Password Reset Complete!
              </h2>
              
              <p className="trades-body mb-8" style={{ color: '#6B7280' }}>
                Your password has been successfully reset. You can now sign in with your new password.
              </p>

              <Button
                onClick={onBack}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                Sign In Now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
