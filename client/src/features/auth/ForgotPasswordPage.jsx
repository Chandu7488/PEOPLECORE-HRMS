import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      // Keep message non-revealing
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Account Recovery
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Reset your password securely via work email
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Request Processed</h3>
              <p className="text-sm text-slate-600 mb-6">
                If that email is registered, we have sent a reset link. Please check your inbox (or development server terminal) to proceed.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 text-left mb-6">
                <p className="font-semibold text-slate-700 mb-1">Security Notice:</p>
                <p>• The reset link is single-use and valid for 30 minutes.</p>
                <p>• If you did not request this, you can safely disregard it.</p>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-xs text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Return to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered work email address below. We will send a secure password reset link to your account.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Work Email Address
                </label>
                <div className="mt-1.5 relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Processing...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowLeft className="mr-1.5 w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
