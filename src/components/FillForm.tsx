import React, { useState, useRef, useEffect } from 'react';
import { SignaturePad } from './SignaturePad';
import { ImageCropDialog } from './ImageCropDialog';
import { CheckCircle2, Building2, ShieldCheck, FileSignature, AlertCircle, Upload, Image as ImageIcon, X, RotateCcw } from 'lucide-react';
import { submitForm } from '../api';
import { Link } from 'react-router-dom';
import { useDraftStore, isDraftDirty } from '../store/draftStore';

export function FillForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Draft is persisted to localStorage so a refresh / accidental close doesn't
  // wipe a half-filled form (nothing is stored server-side until submit).
  const { formData, aadhaarFront, aadhaarBack, setField, setAadhaar, reset } = useDraftStore();
  const [cropTarget, setCropTarget] = useState<{ src: string; side: 'front' | 'back' } | null>(null);
  // Whether a saved draft was restored on this load (computed once, before edits).
  const [draftRestored, setDraftRestored] = useState(() => isDraftDirty(useDraftStore.getState()));

  const [consentRead, setConsentRead] = useState(false);
  const consentBoxRef = useRef<HTMLDivElement>(null);

  const checkConsentScroll = () => {
    const el = consentBoxRef.current;
    if (!el || consentRead) return;
    // Unlock once scrolled to (nearly) the bottom; also covers screens tall
    // enough that the declaration doesn't scroll at all.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setConsentRead(true);
    }
  };

  useEffect(() => {
    checkConsentScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropTarget({ src: event.target?.result as string, side });
      };
      reader.readAsDataURL(file);
    }
    // Allow re-selecting the same file after a cancel.
    e.target.value = '';
  };

  const handleCropConfirm = (dataUrl: string) => {
    if (!cropTarget) return;
    setAadhaar(cropTarget.side, dataUrl);
    setCropTarget(null);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setField({ [name]: checked });
    } else {
      setField({ [name]: value });
    }
    setError(null);
  };

  const handleSignatureChange = (url: string | null) => {
    setField({ signatureUrl: url });
    setError(null);
  };

  const handleClearForm = () => {
    if (window.confirm('Clear the form and delete the saved draft? This cannot be undone.')) {
      reset();
      setDraftRestored(false);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: [keyof typeof formData, string][] = [
      ['date', 'Date'],
      ['customerName', 'Customer Name'],
      ['fatherSpouseName', "Father's/Spouse's Name"],
      ['address', 'Address'],
      ['mobileNumber', 'Mobile Number'],
      ['emailId', 'Email ID'],
      ['serviceDescription', 'Service Description'],
      ['amountPayable', 'Amount Payable'],
      ['modeOfPayment', 'Mode of Payment'],
      ['transactionRef', 'Transaction Reference No.'],
      ['paymentDate', 'Date of Payment'],
      ['place', 'Place'],
    ];
    const missing = requiredFields
      .filter(([key]) => !String(formData[key] ?? '').trim())
      .map(([, label]) => label);
    if (!aadhaarFront) missing.push('Aadhaar Card (Front)');
    if (!aadhaarBack) missing.push('Aadhaar Card (Back)');
    if (!formData.signatureUrl) missing.push('Digital Signature');

    if (missing.length > 0) {
      setError(`All fields are mandatory. Please fill: ${missing.join(', ')}.`);
      return;
    }

    if (!formData.agreed) {
      setError("Please check the consent box to proceed.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { agreed, signatureUrl, ...details } = formData;

      const result = await submitForm({
        ...details,
        signature: signatureUrl!,
        aadhaarFront: aadhaarFront!,
        aadhaarBack: aadhaarBack!
      });

      setSubmittedData(result);
      setIsSubmitted(true);
      reset(); // Draft is now persisted server-side — clear the local draft.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Form Submitted</h2>
          <p className="text-slate-600">Your consent form has been securely recorded.</p>
          <button
            onClick={() => window.close()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  // Edit Mode (Form)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      {cropTarget && (
        <ImageCropDialog
          src={cropTarget.src}
          title={`Crop Aadhaar Card (${cropTarget.side === 'front' ? 'Front' : 'Back'})`}
          onCancel={() => setCropTarget(null)}
          onConfirm={handleCropConfirm}
        />
      )}
      <div className="w-full max-w-4xl mb-4 flex justify-end no-print">
        <Link to="/admin" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
          Admin Login
        </Link>
      </div>

      <div className="max-w-4xl w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building2 className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-center items-center gap-3 mb-3">
              <Building2 className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">PMI SERVICES ENTERPRISES</h1>
            </div>
            <h2 className="text-lg text-slate-300 font-medium uppercase tracking-widest">
              Consent & Payment Authorization
            </h2>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-10 space-y-10">

          {draftRestored && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-4 py-3 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                Draft restored — your previously entered details were saved on this device.
              </div>
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold whitespace-nowrap transition-colors"
              >
                <X className="w-4 h-4" />
                Clear form
              </button>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            All fields marked with * are mandatory — the form cannot be submitted until every field, document upload, and the signature are completed.
          </div>


          {/* Customer Details section */}
          <section>
            <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-6">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">1. Customer Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date *</label>
                <input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full md:w-1/3 px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input 
                  type="text" 
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Father's/Spouse's Name *</label>
                <input
                  type="text"
                  name="fatherSpouseName"
                  value={formData.fatherSpouseName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter relative's name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400 resize-none"
                  placeholder="Enter full residential address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input 
                  type="tel" 
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="+91 00000 00000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email ID *</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
          </section>

          {/* Identity Documents section */}
          <section>
            <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-6">
              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">2. Identity Documents *</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Aadhaar Card (Front) *</label>
                {aadhaarFront ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={aadhaarFront} alt="Aadhaar Front" className="w-full max-h-72 object-contain bg-slate-50" />
                    <button
                      type="button"
                      onClick={() => setAadhaar('front', null)}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Click to upload front</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(e, 'front')} />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Aadhaar Card (Back) *</label>
                {aadhaarBack ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={aadhaarBack} alt="Aadhaar Back" className="w-full max-h-72 object-contain bg-slate-50" />
                    <button
                      type="button"
                      onClick={() => setAadhaar('back', null)}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Click to upload back</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(e, 'back')} />
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* Payment Details section */}
          <section>
            <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-6">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                <FileSignature className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">3. Payment Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Service Description *</label>
                <input
                  type="text"
                  name="serviceDescription"
                  value={formData.serviceDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="Describe the services availed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount Payable (₹) *</label>
                <input 
                  type="number" 
                  name="amountPayable"
                  value={formData.amountPayable}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400 font-bold"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mode of Payment *</label>
                <select
                  name="modeOfPayment"
                  value={formData.modeOfPayment}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Transaction Reference No. *</label>
                <input
                  type="text"
                  name="transactionRef"
                  value={formData.transactionRef}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="e.g. UPI Ref / Cheque No."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Payment *</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900"
                  required
                />
              </div>
            </div>
          </section>

          {/* Consent Declaration text box */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4 text-blue-900">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold">Consent Declaration</h3>
            </div>
            
            <div
              ref={consentBoxRef}
              onScroll={checkConsentScroll}
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-h-64 overflow-y-auto text-sm text-slate-700 space-y-4 mb-6"
            >
              <p>
                I, <strong>{formData.customerName || '[Customer Name]'}</strong>, hereby confirm that I have voluntarily availed/requested services from PMI Services Enterprises and agree to make payment for the services provided. I further declare and consent to the following:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>I have been informed about the nature, scope, and charges of the services provided by PMI Services Enterprises and have no objection to making payment for the same.</li>
                <li>I understand and accept all applicable fees, taxes, and other charges relating to the services availed.</li>
                <li>I voluntarily authorize PMI Services Enterprises to receive and process my payment through the agreed mode of payment.</li>
                <li>I confirm that the funds used for making payment belong to me and are derived from lawful sources.</li>
                <li>I understand that any refund, cancellation, or adjustment, if applicable, shall be governed by the terms and conditions of PMI Services Enterprises.</li>
                <li>I declare that all information and documents furnished by me are true, accurate, and complete to the best of my knowledge.</li>
                <li>I agree that PMI Services Enterprises shall not be held liable for any loss, delay, or issue arising from incorrect information provided by me or from unauthorized use of my payment instrument.</li>
                <li>I expressly agree that any dispute, claim, difference, or legal proceeding arising out of or relating to the services provided, this consent form, or any payment transaction shall be subject to the exclusive jurisdiction of the competent courts at Tikamgarh, Madhya Pradesh, and no other court shall have jurisdiction in such matters.</li>
              </ol>
              <div className="mt-4 pt-4 border-t border-slate-100 font-medium italic text-slate-800">
                "I have carefully read and understood the contents of this Consent and Payment Authorization Form. I voluntarily execute this document and provide my consent without any coercion, undue influence, or misrepresentation."
              </div>
            </div>

            {!consentRead && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Please scroll through the full declaration above to enable the agreement checkbox.
              </div>
            )}

            <label className={`flex items-start gap-3 group ${consentRead ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="agreed"
                  checked={formData.agreed}
                  onChange={handleInputChange}
                  disabled={!consentRead}
                  className="peer w-6 h-6 appearance-none border-2 border-slate-300 rounded enabled:hover:border-blue-500 checked:bg-blue-600 checked:border-blue-600 transition-colors disabled:bg-slate-100"
                  required
                />
                <CheckCircle2 className="w-4 h-4 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100" />
              </div>
              <span className={`text-slate-800 font-medium leading-tight transition-colors ${consentRead ? 'group-hover:text-blue-900' : ''}`}>
                I agree to the terms, conditions, and consent declarations outlined above. *
              </span>
            </label>
          </section>

          {/* Signature and Place */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Place *</label>
                <input 
                  type="text" 
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400 mb-4"
                  placeholder="Enter current city/place"
                  required
                />
                
                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  By signing, you are providing a legally binding digital signature matching the declarations in this form.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Digital Signature *</label>
                <SignaturePad onChange={handleSignatureChange} />
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:transform-none"
            >
              <ShieldCheck className="w-6 h-6" />
              {isSubmitting ? 'Submitting...' : 'Submit Authorization'}
            </button>
            <p className="text-center text-slate-500 text-sm mt-4">
              All information is securely processed.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
