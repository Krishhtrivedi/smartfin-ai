import React, { useState } from 'react';
import { Compass, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, forgotPassword, resetPassword, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot / Reset states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset request.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      await resetPassword(email, resetToken, newPassword);
      setSuccessMsg('Your password has been successfully reset. Please sign in with your new password.');
      setMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Invalid or expired token.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D2035] blueprint-grid-navy-deep flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Brand Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-[#364452] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[3px] bg-[#1A2F46] border border-[#E65909]/60 flex items-center justify-center text-[#E65909] shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-extrabold text-white text-lg tracking-tight uppercase">
                SMARTFIN.AI
              </span>
              <span className="text-[10px] font-mono font-semibold bg-[#E65909] text-white px-1.5 py-0.5 rounded-[2px] uppercase">
                PRODUCTION
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#8B97A3] uppercase tracking-wider">
              Finance & Office Automation System
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#8B97A3]">ENTERPRISE ACCESS</span>
          <span className="text-[#364452]">|</span>
          <span className="text-[#F86927] font-semibold">256-BIT ENCRYPTION</span>
        </div>
      </div>

      {/* Main Split Container */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8">
        {/* Left Column: Organization & Security Statement */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[3px] bg-[#1A2F46] border border-[#364452] text-[11px] font-mono text-[#F86927]">
            <span>SMARTFIN.AI</span>
            <span className="text-[#8B97A3]">/</span>
            <span>OFFICIAL PRODUCTION ENVIRONMENT</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-[1.08]">
            Organisational Financial Systems{' '}
            <span className="text-[#F86927]">by Design.</span>
          </h1>

          <p className="font-sans text-sm sm:text-base text-[#8B97A3] max-w-xl leading-relaxed">
            Centralized automated management for GST reconciliation, TDS/TCS statutory thresholds, bank statement reconciliation, vendor/customer ledgers, and office operations. Access is restricted to authorized personnel.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#364452]">
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#F86927] font-bold block">01 / AUDIT READY</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">Immutable Logs</span>
              <span className="text-[10px] text-[#7C8793] block">Traceable actions</span>
            </div>
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#F86927] font-bold block">02 / RBAC CONTROL</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">Role Enforcement</span>
              <span className="text-[10px] text-[#7C8793] block">Admin & Employee scopes</span>
            </div>
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#E65909] pt-2 block">03 / REAL DATA</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">Live Database</span>
              <span className="text-[10px] text-[#7C8793] block">PostgreSQL managed</span>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Authentication Form */}
        <div className="lg:col-span-5 bg-[#F6F3EE] p-6 sm:p-8 rounded-[3px] border border-[#C5CBD2] shadow-2xl text-[#171E25]">
          {/* Header */}
          <div className="border-b border-[#C5CBD2] pb-4 mb-5">
            <span className="font-mono text-[10px] text-[#E65909] uppercase tracking-wider font-semibold block">
              {mode === 'login' ? 'SECURE SYSTEM LOGIN' : mode === 'forgot' ? 'PASSWORD RECOVERY' : 'RESET PASSWORD'}
            </span>
            <h2 className="font-display font-bold text-xl text-[#1A2F46] mt-1">
              {mode === 'login' && 'Sign In to SMARTFIN.AI'}
              {mode === 'forgot' && 'Reset Account Password'}
              {mode === 'reset' && 'Set New Permanent Password'}
            </h2>
            <p className="text-xs text-[#5D646C] mt-0.5">
              {mode === 'login' && 'Enter your authorized organisational credentials to proceed.'}
              {mode === 'forgot' && 'Enter your registered corporate email to receive a reset token.'}
              {mode === 'reset' && 'Provide your reset verification token and choose a secure password.'}
            </p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-[3px] bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-[3px] bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form className="space-y-3.5" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8B97A3] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smartfin.ai"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-[#4A545D] uppercase tracking-wider font-semibold">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-mono text-[#E65909] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8B97A3] absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8B97A3] hover:text-[#171E25]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-[#4A545D]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded-[2px] border-[#C5CBD2] text-[#E65909] focus:ring-[#E65909]"
                  />
                  <span className="font-mono text-[11px]">Remember this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-signal w-full py-2.5 px-4 flex items-center justify-center space-x-2 text-xs font-semibold mt-4"
              >
                <span>{isLoading ? 'Verifying Identity...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form className="space-y-3.5" onSubmit={handleForgotSubmit}>
              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Registered Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8B97A3] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smartfin.ai"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-signal w-full py-2.5 px-4 flex items-center justify-center space-x-2 text-xs font-semibold mt-4"
              >
                <span>{isLoading ? 'Generating Token...' : 'Send Password Reset Token'}</span>
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-xs font-mono text-[#5D646C] hover:text-[#171E25] mt-2 block"
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form className="space-y-3.5" onSubmit={handleResetSubmit}>
              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Reset Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Enter 32-character token"
                  className="w-full px-3 py-2 text-xs font-mono rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-signal w-full py-2.5 px-4 flex items-center justify-center space-x-2 text-xs font-semibold mt-4"
              >
                <span>{isLoading ? 'Updating Password...' : 'Confirm & Save Password'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-xs font-mono text-[#5D646C] hover:text-[#171E25] mt-2 block"
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-5 pt-4 border-t border-[#C5CBD2] text-[11px] text-[#5D646C] font-mono flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E65909]" />
              <span>TLS 1.3 / Strict RBAC</span>
            </span>
            <span>SMARTFIN.AI</span>
          </div>
        </div>
      </div>

      {/* Bottom Credo & Security Bar */}
      <div className="max-w-6xl w-full mx-auto border-t border-[#364452] pt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#8B97A3] gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#E65909]" />
          <span>SMARTFIN.AI · Production System · Authorized Use Only</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Security Protocol v1.0</span>
          <span className="text-[#364452]">•</span>
          <span className="text-[#F86927]">All Activities Audit-Logged</span>
        </div>
      </div>
    </div>
  );
};
