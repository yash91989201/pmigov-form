import React, { useEffect, useState } from 'react';
import { Eye, Trash2, Download, LogOut, AlertCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Link } from 'react-router-dom';
import { apiUrl } from '../api';
import { useAdminStore } from '../store/adminStore';
import { errorMessage } from '../errors';
export function AdminPanel() {
  const { forms, loading, error, authed, fetchForms, login, logout, remove } = useAdminStore();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      await login(password);
      setPassword('');
    } catch (err: unknown) {
      setLoginError(errorMessage(err, 'Login failed.'));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await remove(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm uppercase tracking-widest text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-sm w-full bg-paper rounded-sm shadow-xl border border-rule border-t-4 border-t-ink p-8 sm:p-10">
          <div className="flex flex-col items-center gap-3 mb-7">
            <BrandLogo size="lg" />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-seal">Restricted Access</p>
            <h1 className="font-display text-2xl font-semibold text-ink">Consent Register</h1>
            <p className="text-sm text-ink-soft text-center">Enter the admin password to access submissions.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
              className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 focus:ring-2 focus:ring-seal/40 focus:border-seal transition-shadow outline-none text-ink"
              placeholder="Admin password"
              autoFocus
              required
            />
            {loginError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md flex items-center gap-2 border-l-2 border-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-ink hover:bg-seal text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-ink"
            >
              {loggingIn ? 'Verifying…' : 'Unlock Register'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-ink-soft hover:text-ink transition-colors">
              Back to Form
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" />
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink leading-tight">Consent Register</h1>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft mt-0.5">
                PMI Services Enterprises · {forms.length} {forms.length === 1 ? 'record' : 'records'} on file
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link to="/" className="bg-white border border-rule text-ink-soft px-4 py-2 rounded-md text-sm font-medium hover:border-ink hover:text-ink transition-colors">
              Back to Form
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border-l-2 border-red-400">
            {error}
          </div>
        )}

        <div className="bg-paper rounded-sm shadow border border-rule border-t-2 border-t-ink overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-soft">
              <thead className="bg-ink/[0.03] text-ink border-b border-rule">
                <tr>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wide">Date</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wide">Name</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wide">Mobile</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wide text-right">Amount</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-ink-soft">
                      No consent forms have been executed yet.
                    </td>
                  </tr>
                ) : (
                  forms.map((form) => (
                    <tr key={form.id} className="border-b border-rule last:border-0 hover:bg-seal-tint/40 transition-colors">
                      <td className="p-4 font-mono text-xs text-ink-soft">{form.date}</td>
                      <td className="p-4 font-medium text-ink">{form.customerName}</td>
                      <td className="p-4 font-mono text-xs">{form.mobileNumber}</td>
                      <td className="p-4 font-mono text-ink text-right">₹{form.amountPayable || '0'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/view/${form.id}`}
                            className="p-2 text-ink-soft hover:text-ink hover:bg-ink/[0.05] rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <a
                            href={apiUrl(`/forms/${form.id}/pdf`)}
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                          <button
                            onClick={() => handleDelete(form.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
