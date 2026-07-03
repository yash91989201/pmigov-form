import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import domtoimage from 'dom-to-image';
import { Download, Printer, ArrowLeft } from 'lucide-react';
import { ConsentFormView } from './ConsentFormView';

export function ViewForm() {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'consent_forms', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data());
        } else {
          setFormData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    setIsGeneratingPDF(true);
    try {
      const imgData = await domtoimage.toPng(element, {
        bgcolor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `PMI_Consent_${formData.customerName ? formData.customerName.replace(/\s+/g, '_') : 'Form'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('Failed to generate PDF. You can try the Print option instead.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-blue-700 border border-blue-300 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full bg-white rounded-xl shadow-xl overflow-hidden card-container p-8 sm:p-12">
        <ConsentFormView formData={formData} />
      </div>
    </div>
  );
}
