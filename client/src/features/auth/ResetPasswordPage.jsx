import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { useAuth } from './AuthContext';
import { Lock, Eye, EyeOff, Check, X, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null: checking, true: valid, false: invalid
  const [accountInfo, setAccountInfo] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { logout } = useAuth();

  // Validate token on component mount and ensure previous session is flushed
  useEffect(() => {
    // If opening an activation/reset token link, clear any stale session in this browser
    if (token) {
      logout();
    }

    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      try {
        const res = await api.post('/auth/reset-password/validate', { token });
        if (res.data.success) {
          setTokenValid(true);
          setAccountInfo(res.data.data);
        } else {
          setTokenValid(false);
        }
      } catch (err) {
        setTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  // Live Password Policy Checklist
  const rules = [
    { label: 'At least 8 characters long', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#$...)', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ];

  const allRulesPassed = rules.every((r) => r.valid);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRulesPassed) {
      setError('Please satisfy all password complexity criteria');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      if (res.data.data?.email) {
        setAccountInfo((prev) => ({ ...prev, email: res.data.data.email, name: res.data.data.name }));
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-2xl sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Link Invalid or Expired</h3>
            <p className="text-sm text-slate-600 mb-6">
              This activation or password reset link is invalid, already used, or has expired.
            </p>
            <Link
              to="/login"
              className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Return to Login Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            P
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Activate Your HRMS Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          {accountInfo?.name ? (
            <>Welcome aboard, <strong className="text-indigo-600">{accountInfo.name}</strong> ({accountInfo.email})</>
          ) : (
            'Configure your confidential password to begin accessing your employee portal'
          )}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-2xl sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Account Activated Successfully!</h3>
              <p className="text-xs text-slate-600 mb-6">
                Your password has been securely created. You can now sign in to your HRMS dashboard using{' '}
                <strong className="text-slate-900 font-semibold">{accountInfo?.email}</strong>.
              </p>
              <Link
                to={`/login?email=${encodeURIComponent(accountInfo?.email || '')}`}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                Sign In to PeopleCore HRMS
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700">New Password</label>
                <div className="mt-1.5 relative rounded-lg shadow-xs">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                <div className="mt-1.5 relative rounded-lg shadow-xs">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••••••"
                  />
                </div>
                {confirmPassword && (
                  <p className={`mt-1 text-xs flex items-center ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5 mr-1" /> : <X className="w-3.5 h-3.5 mr-1" />}
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Live Policy Checklist */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">Password Requirements:</p>
                <div className="space-y-1.5">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center text-xs">
                      {rule.valid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 mr-2 shrink-0" />
                      )}
                      <span className={rule.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !allRulesPassed || !passwordsMatch}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
