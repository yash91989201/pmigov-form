import React, { useEffect, useState } from 'react';
import { Eye, Building2, Trash2, Download, Lock, LogOut, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';

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
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-xl border border-slate-200 p-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="bg-slate-900 text-white p-3 rounded-full">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Admin Login</h1>
            <p className="text-sm text-slate-500 text-center">Enter the admin password to access submissions.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900"
              placeholder="Admin password"
              autoFocus
              required
            />
            {loginError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-slate-900 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Back to Form
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Admin Panel - PMI GOV</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded hover:bg-slate-50 transition-colors">
              Back to Form
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Mobile</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No consent forms submitted yet.
                    </td>
                  </tr>
                ) : (
                  forms.map((form) => (
                    <tr key={form.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">{form.date}</td>
                      <td className="p-4 font-medium text-slate-900">{form.customerName}</td>
                      <td className="p-4">{form.mobileNumber}</td>
                      <td className="p-4">₹ {form.amountPayable || '0'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/view/${form.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <a
                            href={`/api/forms/${form.id}/pdf`}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
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
