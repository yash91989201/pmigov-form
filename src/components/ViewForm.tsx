import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiError, ConsentFormDetail } from '../api';
import { Download, ArrowLeft } from 'lucide-react';
import { ConsentFormView } from './ConsentFormView';
import { useAdminStore } from '../store/adminStore';

export function ViewForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loadForm = useAdminStore((s) => s.loadForm);
  const [formData, setFormData] = useState<ConsentFormDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) return;
      try {
        setFormData(await loadForm(id));
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 401) {
          // Not logged in — send to the admin login screen.
          navigate('/admin');
          return;
        }
        setFormData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [id, navigate, loadForm]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <p>Form not found.</p>
        <Link to="/admin" className="text-blue-600 underline">Back to Admin</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center no-print">
        <Link to="/admin" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Admin
        </Link>
        <a
          href={`/api/forms/${id}/pdf`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      </div>

      <div className="max-w-4xl w-full bg-white rounded-xl shadow-xl overflow-hidden card-container p-8 sm:p-12">
        <ConsentFormView formData={formData} />
      </div>
    </div>
  );
}
