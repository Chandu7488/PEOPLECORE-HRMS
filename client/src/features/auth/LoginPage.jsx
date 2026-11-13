import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Users, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Email or password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Helper for 1-click filling demo roles during testing
  const selectDemoRole = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('PeopleCore@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          PeopleCore HRMS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your workplace portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sign In Failed</p>
                <p className="text-red-600 mt-0.5 text-xs">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Work Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Work Email
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 h-5" />}
                </button>
              </div>

              {/* Forgot password link directly under password field (per Section 7.1) */}
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    Sign in to PeopleCore
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Employee Onboarding Help Notice */}
          <div className="mt-6 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-center text-xs text-slate-600">
            <span>Recently hired or setting up your account? </span>
            <Link to="/forgot-password" className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              Activate Account / Set Password
            </Link>
          </div>

          {/* Demo Role Switcher (Collapsible for Clean Enterprise Look) */}
          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <span>{showDemoAccounts ? 'Hide Demo Logins ▲' : '⚡ Developer Demo Credentials (Click to expand) ▼'}</span>
            </button>

            {showDemoAccounts && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password for all demo accounts: PeopleCore@2026
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => selectDemoRole('admin@peoplecore.local')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <span className="font-semibold block text-slate-800">Super Admin</span>
                    <span className="text-slate-500 text-[10px]">admin@peoplecore.local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDemoRole('hr@peoplecore.local')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <span className="font-semibold block text-slate-800">HR Admin</span>
                    <span className="text-slate-500 text-[10px]">hr@peoplecore.local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDemoRole('manager@peoplecore.local')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <span className="font-semibold block text-slate-800">Manager</span>
                    <span className="text-slate-500 text-[10px]">manager@peoplecore.local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectDemoRole('employee@peoplecore.local')}
                    className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <span className="font-semibold block text-slate-800">Employee</span>
                    <span className="text-slate-500 text-[10px]">employee@peoplecore.local</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
