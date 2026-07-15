import React, { useState, useRef, useEffect } from 'react';
import { SignaturePad } from './SignaturePad';
import { ImageCropDialog } from './ImageCropDialog';
import { BrandLogo } from './BrandLogo';
import { CertificationSelect } from './CertificationSelect';
import { CheckCircle2, ShieldCheck, AlertCircle, Upload, X, RotateCcw, Landmark, QrCode } from 'lucide-react';
import { submitForm } from '../api';
import { errorMessage } from '../errors';
import { useDraftStore, isDraftDirty } from '../store/draftStore';
import { validateForm, FIELD_ORDER, COUNTRIES, type FieldErrors } from '../validation';
import upiQr from '../assets/upi-qr.jpeg';

const PMI_BANK_DETAILS = {
  bankName: 'AXIS BANK',
  accountHolderName: 'PMI SERVICES ENTERPRISES',
  accountNumber: '926020017030914',
  ifscCode: 'UTIB0001398',
};

const PMI_UPI_ID = '7460070899@ptyes';

// Shared input styling; border/ring swaps to red when the field has an error.
const INPUT_BASE =
  'w-full px-3.5 py-2.5 rounded-md border bg-white transition-shadow outline-none text-ink placeholder:text-slate-400';

// Engraved section heading: a serif Roman numeral in a ruled box, a serif
// title, and a hairline rule — the structure of a clause in a legal deed.
function SectionHeader({ numeral, title, note }: { numeral: string; title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-rule pb-3 mb-6">
      <span className="flex-shrink-0 w-9 h-9 border border-ink/25 rounded-sm flex items-center justify-center font-display text-lg font-semibold text-seal leading-none translate-y-0.5">
        {numeral}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-xl sm:text-2xl font-semibold text-ink leading-tight">{title}</h3>
        {note && <p className="text-xs text-ink-soft mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export function FillForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Draft is persisted to localStorage so a refresh / accidental close doesn't
  // wipe a half-filled form (nothing is stored server-side until submit).
  const { formData, aadhaarFront, aadhaarBack, panCard, setField, setAadhaar, setPanCard, reset } = useDraftStore();
  const [cropTarget, setCropTarget] = useState<{ src: string; side: 'front' | 'back' | 'pan' } | null>(null);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back' | 'pan') => {
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

  // Clears one field's inline error (used as the user edits/fixes it).
  const clearFieldError = (name: string) =>
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleCropConfirm = (dataUrl: string) => {
    if (!cropTarget) return;
    if (cropTarget.side === 'pan') {
      setPanCard(dataUrl);
      clearFieldError('panCard');
    } else {
      setAadhaar(cropTarget.side, dataUrl);
      clearFieldError(cropTarget.side === 'front' ? 'aadhaarFront' : 'aadhaarBack');
    }
    setCropTarget(null);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setField({ [name]: checked });
      if (checked) clearFieldError(name);
    } else {
      setField({ [name]: value });
      clearFieldError(name);
    }
    setError(null);
  };

  // Validates a single field on blur so mistakes surface before submit.
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const name = e.target.name;
    const all = validateForm({ ...formData }, aadhaarFront, aadhaarBack, panCard);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (all[name]) next[name] = all[name];
      else delete next[name];
      return next;
    });
  };

  const handleSignatureChange = (url: string | null) => {
    setField({ signatureUrl: url });
    if (url) clearFieldError('signature');
    setError(null);
  };

  const handleClearForm = () => {
    if (window.confirm('Clear the form and delete the saved draft? This cannot be undone.')) {
      reset();
      setDraftRestored(false);
      setError(null);
    }
  };

  // Full input className with the border/ring turning red on error.
  const fieldClass = (name: string, extra = '') =>
    `${INPUT_BASE} ${extra} ${
      fieldErrors[name]
        ? 'border-red-400 focus:ring-2 focus:ring-red-500/60 focus:border-red-500'
        : 'border-slate-300 focus:ring-2 focus:ring-seal/40 focus:border-seal'
    }`;

  // Small-caps document label shared by every field.
  const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-ink/70 mb-1.5';

  // Inline error message shown under a field.
  const renderError = (name: string) =>
    fieldErrors[name] ? (
      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        {fieldErrors[name]}
      </p>
    ) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm({ ...formData }, aadhaarFront, aadhaarBack, panCard);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please correct the highlighted fields before submitting.');
      // Focus/scroll to the first invalid field in visual order.
      const first = FIELD_ORDER.find((f) => errors[f]);
      if (first) {
        const el = document.getElementsByName(first)[0] as HTMLElement | undefined;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus?.();
        } else {
          // Upload/signature/consent have no named input — scroll to the message.
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setError(null);

    try {
      const { agreed, signatureUrl, countryCode, mobileNumber, ...details } = formData;

      const result = await submitForm({
        ...details,
        mobileNumber: `${countryCode} ${mobileNumber}`.trim(),
        signature: signatureUrl!,
        aadhaarFront: aadhaarFront!,
        aadhaarBack: aadhaarBack!,
        panCard: panCard!,
      });

      setSubmittedData(result);
      setIsSubmitted(true);
      reset(); // Draft is now persisted server-side — clear the local draft.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error(err);
      setError(errorMessage(err, 'Failed to submit form. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans">
        <div className="max-w-md w-full bg-paper rounded-sm shadow-xl border border-rule border-t-4 border-t-ink overflow-hidden p-8 sm:p-10 text-center">
          {/* Executed seal */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 rounded-full border-2 border-seal/30 flex items-center justify-center">
              <div className="absolute inset-1.5 rounded-full border border-dashed border-seal/40" />
              <ShieldCheck className="w-9 h-9 text-seal" />
            </div>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-seal mb-2">Instrument Executed</p>
          <h2 className="font-display text-2xl font-semibold text-ink mb-3">Authorization Recorded</h2>
          <p className="text-ink-soft leading-relaxed mb-8">
            Your consent and payment authorization has been securely recorded. You may now close this tab.
          </p>
          <button
            onClick={() => window.close()}
            className="w-full bg-ink hover:bg-ink-deep text-white font-semibold py-3 px-6 rounded-md transition-colors"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  // Edit Mode (Form)
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 font-sans">
      {cropTarget && (
        <ImageCropDialog
          src={cropTarget.src}
          title={
            cropTarget.side === 'pan'
              ? 'Crop PAN Card'
              : `Crop Aadhaar Card (${cropTarget.side === 'front' ? 'Front' : 'Back'})`
          }
          onCancel={() => setCropTarget(null)}
          onConfirm={handleCropConfirm}
        />
      )}
      <div className="card-container max-w-3xl w-full bg-paper rounded-sm shadow-xl overflow-hidden border border-rule border-t-4 border-t-ink">

        {/* Letterhead — engraved seal, serif title, monospace reference bar */}
        <header className="bg-ink-deep text-white px-6 sm:px-10 pt-8 sm:pt-10 pb-0 relative overflow-hidden">
          <div className="flex items-start gap-4 sm:gap-5">
            <BrandLogo size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-gold mb-1.5">
                Consent Instrument
              </p>
              <h1 className="font-display text-2xl sm:text-3xl md:text-[2rem] font-semibold leading-tight tracking-tight">
                PMI Services
              </h1>
              <h2 className="text-xs sm:text-sm text-slate-300/90 font-medium uppercase tracking-[0.18em] mt-1">
                Consent &amp; Payment Authorization
              </h2>
            </div>
          </div>
          {/* Gold hairline */}
          <div className="mt-6 sm:mt-7 h-px bg-gradient-to-r from-gold/70 via-gold/40 to-transparent" />
          {/* Reference metadata strip */}
          <dl className="flex flex-wrap gap-x-6 gap-y-1.5 py-3.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400">
            <div className="flex gap-1.5"><dt className="text-slate-500">Form</dt><dd className="text-slate-200">PMI/CPA-01</dd></div>
            <div className="flex gap-1.5"><dt className="text-slate-500">Type</dt><dd className="text-slate-200">Deed of Consent</dd></div>
            <div className="flex gap-1.5"><dt className="text-slate-500">Jurisdiction</dt><dd className="text-slate-200">Tikamgarh, M.P.</dd></div>
          </dl>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="px-6 sm:px-10 py-8 sm:py-10 space-y-10 sm:space-y-12">

          {draftRestored && (
            <div className="bg-seal-tint border-l-2 border-seal text-seal text-sm font-medium px-4 py-3 rounded-r-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-start sm:items-center gap-2">
                <RotateCcw className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                Draft restored — your previously entered details were saved on this device.
              </div>
              <button
                type="button"
                onClick={handleClearForm}
                className="flex items-center gap-1.5 hover:text-ink font-semibold whitespace-nowrap transition-colors self-end sm:self-auto"
              >
                <X className="w-4 h-4" />
                Clear form
              </button>
            </div>
          )}

          <div className="bg-ink/[0.03] border-l-2 border-ink/30 text-ink-soft text-sm px-4 py-3 rounded-r-md flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-ink/50" />
            <span>Fields marked <span className="text-seal font-semibold">*</span> are mandatory. This instrument cannot be executed until every field, document, and the signature are completed.</span>
          </div>


          {/* Customer Details section */}
          <section>
            <SectionHeader numeral="I" title="Customer Details" note="Identity and contact particulars of the executant" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2">
                <label className={LABEL}>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('date', 'md:w-1/3')}
                  required
                />
                {renderError('date')}
              </div>

              <div>
                <label className={LABEL}>Customer Name *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('customerName')}
                  placeholder="Enter full name"
                  required
                />
                {renderError('customerName')}
              </div>

              <div>
                <label className={LABEL}>Father's/Spouse's Name *</label>
                <input
                  type="text"
                  name="fatherSpouseName"
                  value={formData.fatherSpouseName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('fatherSpouseName')}
                  placeholder="Enter relative's name"
                  required
                />
                {renderError('fatherSpouseName')}
              </div>

              <div className="md:col-span-2">
                <label className={LABEL}>Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  rows={2}
                  className={fieldClass('address', 'resize-none')}
                  placeholder="Enter full residential address"
                  required
                />
                {renderError('address')}
              </div>

              <div>
                <label className={LABEL}>Mobile Number *</label>
                <div
                  className={`flex rounded-md border bg-white transition-shadow ${
                    fieldErrors.mobileNumber
                      ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/60 focus-within:border-red-500'
                      : 'border-slate-300 focus-within:ring-2 focus-within:ring-seal/40 focus-within:border-seal'
                  }`}
                >
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={(e) => {
                      setField({ countryCode: e.target.value });
                      clearFieldError('mobileNumber');
                      setError(null);
                    }}
                    aria-label="Country dialing code"
                    className="shrink-0 max-w-[7.5rem] bg-transparent border-0 rounded-l-md pl-3 pr-2 py-2.5 text-ink outline-none focus:ring-0 cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={`${c.name}-${c.dial}`} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <span className="w-px bg-slate-200 my-1.5" aria-hidden="true" />
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className="flex-1 min-w-0 bg-transparent border-0 rounded-r-md px-3 py-2.5 text-ink placeholder:text-slate-400 outline-none focus:ring-0"
                    placeholder="00000 00000"
                    required
                  />
                </div>
                {renderError('mobileNumber')}
              </div>

              <div>
                <label className={LABEL}>Email ID *</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('emailId')}
                  placeholder="name@example.com"
                  required
                />
                {renderError('emailId')}
              </div>
            </div>
          </section>

          {/* Identity Documents section */}
          <section>
            <SectionHeader numeral="II" title="Identity Documents" note="Upload clear images of both sides of your Aadhaar card, and your PAN card" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={LABEL}>Aadhaar Card (Front) *</label>
                {aadhaarFront ? (
                  <div className="relative rounded-md overflow-hidden border border-rule">
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
                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md cursor-pointer transition-colors ${fieldErrors.aadhaarFront ? 'border-red-400 bg-red-50 hover:bg-red-100' : 'border-slate-300 bg-slate-50 hover:border-seal hover:bg-seal-tint/50'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-7 h-7 text-ink/40 mb-2" />
                      <p className="text-sm text-ink-soft font-medium">Click to upload front</p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG or PNG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(e, 'front')} />
                  </label>
                )}
                {renderError('aadhaarFront')}
              </div>

              <div>
                <label className={LABEL}>Aadhaar Card (Back) *</label>
                {aadhaarBack ? (
                  <div className="relative rounded-md overflow-hidden border border-rule">
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
                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md cursor-pointer transition-colors ${fieldErrors.aadhaarBack ? 'border-red-400 bg-red-50 hover:bg-red-100' : 'border-slate-300 bg-slate-50 hover:border-seal hover:bg-seal-tint/50'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-7 h-7 text-ink/40 mb-2" />
                      <p className="text-sm text-ink-soft font-medium">Click to upload back</p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG or PNG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(e, 'back')} />
                  </label>
                )}
                {renderError('aadhaarBack')}
              </div>

              <div>
                <label className={LABEL}>PAN Card *</label>
                {panCard ? (
                  <div className="relative rounded-md overflow-hidden border border-rule">
                    <img src={panCard} alt="PAN Card" className="w-full max-h-72 object-contain bg-slate-50" />
                    <button
                      type="button"
                      onClick={() => setPanCard(null)}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-md cursor-pointer transition-colors ${fieldErrors.panCard ? 'border-red-400 bg-red-50 hover:bg-red-100' : 'border-slate-300 bg-slate-50 hover:border-seal hover:bg-seal-tint/50'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-7 h-7 text-ink/40 mb-2" />
                      <p className="text-sm text-ink-soft font-medium">Click to upload PAN card</p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG or PNG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload(e, 'pan')} />
                  </label>
                )}
                {renderError('panCard')}
              </div>
            </div>
          </section>

          {/* Payment Details section */}
          <section>
            <SectionHeader numeral="III" title="Payment Details" note="The consideration and mode of payment being authorized" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2">
                <label className={LABEL}>Select Certification(s) *</label>
                <CertificationSelect
                  name="serviceDescription"
                  value={formData.serviceDescription}
                  className={fieldClass('serviceDescription')}
                  onChange={(v) => {
                    setField({ serviceDescription: v });
                    clearFieldError('serviceDescription');
                    setError(null);
                  }}
                  onBlur={() => {
                    // Read store — onChange may not have flushed into this render yet.
                    const latest = useDraftStore.getState();
                    const all = validateForm(latest.formData, latest.aadhaarFront, latest.aadhaarBack, latest.panCard);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      if (all.serviceDescription) next.serviceDescription = all.serviceDescription;
                      else delete next.serviceDescription;
                      return next;
                    });
                  }}
                />
                {renderError('serviceDescription')}
              </div>

              <div>
                <label className={LABEL}>Amount Payable *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-ink-soft pointer-events-none">₹</span>
                  <input
                    type="number"
                    name="amountPayable"
                    value={formData.amountPayable}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className={fieldClass('amountPayable', 'font-mono font-semibold pl-8')}
                    placeholder="0.00"
                    required
                  />
                </div>
                {renderError('amountPayable')}
              </div>

              <div>
                <label className={LABEL}>Mode of Payment *</label>
                <select
                  name="modeOfPayment"
                  value={formData.modeOfPayment}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('modeOfPayment', 'bg-white')}
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                {renderError('modeOfPayment')}
              </div>

              <div>
                <label className={LABEL}>Transaction Reference No. *</label>
                <input
                  type="text"
                  name="transactionRef"
                  value={formData.transactionRef}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('transactionRef', 'font-mono')}
                  placeholder="UPI Ref / Transfer Ref"
                  required
                />
                {renderError('transactionRef')}
              </div>

              <div>
                <label className={LABEL}>Date of Payment *</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('paymentDate')}
                  required
                />
                {renderError('paymentDate')}
              </div>
            </div>
          </section>

          {/* Bank Account Details section — informational, not user-editable */}
          <section>
            <SectionHeader numeral="IV" title="Bank Account Details" note="Remit payment to the account below, or scan the UPI QR code" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-md border border-rule bg-ink/[0.02] p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Landmark className="w-4 h-4 text-seal" />
                  <h4 className="font-display text-base font-semibold text-ink">PMI Services — Bank Details</h4>
                </div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className={LABEL}>Bank Name</dt>
                    <dd className="text-ink font-medium">{PMI_BANK_DETAILS.bankName}</dd>
                  </div>
                  <div>
                    <dt className={LABEL}>Account Holder Name</dt>
                    <dd className="text-ink font-medium">{PMI_BANK_DETAILS.accountHolderName}</dd>
                  </div>
                  <div>
                    <dt className={LABEL}>Account Number</dt>
                    <dd className="text-ink font-mono font-semibold">{PMI_BANK_DETAILS.accountNumber}</dd>
                  </div>
                  <div>
                    <dt className={LABEL}>IFSC Code</dt>
                    <dd className="text-ink font-mono font-semibold">{PMI_BANK_DETAILS.ifscCode}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-md border border-rule bg-ink/[0.02] p-5 sm:p-6 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-4 self-start">
                  <QrCode className="w-4 h-4 text-seal" />
                  <h4 className="font-display text-base font-semibold text-ink">Scan to Pay via UPI</h4>
                </div>
                <img src={upiQr} alt="PMI Services UPI QR code" className="w-48 h-48 object-contain rounded-md border border-rule bg-white" />
                <p className="mt-3 text-sm text-ink font-mono font-semibold">{PMI_UPI_ID}</p>
                <p className="text-xs text-ink-soft mt-1">Scan with any UPI app</p>
              </div>
            </div>
          </section>

          {/* Consent Declaration text box */}
          <section>
            <SectionHeader numeral="V" title="Consent Declaration" note="Read in full to enable the agreement below" />

            <div
              ref={consentBoxRef}
              onScroll={checkConsentScroll}
              className="bg-[#fbfaf7] p-5 sm:p-7 rounded-md border border-rule max-h-64 overflow-y-auto text-[13px] leading-relaxed text-ink/90 space-y-4 mb-5"
            >
              <p className="first-letter:font-display first-letter:text-2xl first-letter:text-ink first-letter:mr-0.5">
                I, <strong className="font-semibold">{formData.customerName || '[Customer Name]'}</strong>, hereby confirm that I have voluntarily availed/requested services from PMI Services and agree to make payment for the services provided. I further declare and consent to the following:
              </p>
              <ol className="list-decimal pl-5 space-y-2 marker:text-seal marker:font-semibold">
                <li>I have been informed about the nature, scope, and charges of the services provided by PMI Services and have no objection to making payment for the same.</li>
                <li>I understand and accept all applicable fees, taxes, and other charges relating to the services availed.</li>
                <li>I voluntarily authorize PMI Services to receive and process my payment through the agreed mode of payment.</li>
                <li>I confirm that the funds used for making payment belong to me and are derived from lawful sources.</li>
                <li>I understand that any refund, cancellation, or adjustment, if applicable, shall be governed by the terms and conditions of PMI Services.</li>
                <li>I declare that all information and documents furnished by me are true, accurate, and complete to the best of my knowledge.</li>
                <li>I agree that PMI Services shall not be held liable for any loss, delay, or issue arising from incorrect information provided by me or from unauthorized use of my payment instrument.</li>
                <li>I expressly agree that any dispute, claim, difference, or legal proceeding arising out of or relating to the services provided, this consent form, or any payment transaction shall be subject to the exclusive jurisdiction of the competent courts at Tikamgarh, Madhya Pradesh, and no other court shall have jurisdiction in such matters.</li>
              </ol>
              <div className="mt-4 pt-4 border-t border-rule font-display italic text-ink">
                "I have carefully read and understood the contents of this Consent and Payment Authorization Form. I voluntarily execute this document and provide my consent without any coercion, undue influence, or misrepresentation."
              </div>
            </div>

            {!consentRead && (
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border-l-2 border-amber-400 rounded-r-md px-3 py-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Scroll through the full declaration above to enable the agreement.
              </div>
            )}

            <label className={`flex items-start gap-3 group p-3.5 rounded-md border transition-colors ${consentRead ? 'cursor-pointer border-rule bg-seal-tint/40 hover:border-seal' : 'cursor-not-allowed opacity-50 border-rule'}`}>
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  name="agreed"
                  checked={formData.agreed}
                  onChange={handleInputChange}
                  disabled={!consentRead}
                  className="peer w-6 h-6 appearance-none border-2 border-slate-300 rounded enabled:hover:border-seal checked:bg-seal checked:border-seal transition-colors disabled:bg-slate-100"
                  required
                />
                <CheckCircle2 className="w-4 h-4 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100" />
              </div>
              <span className="text-ink font-medium leading-snug">
                I agree to the terms, conditions, and consent declarations set out above. <span className="text-seal">*</span>
              </span>
            </label>
            {renderError('agreed')}
          </section>

          {/* Signature and Place */}
          <section>
            <SectionHeader numeral="VI" title="Execution" note="Executed by the customer at the place stated below" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
              <div>
                <label className={LABEL}>Place of Execution *</label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldClass('place')}
                  placeholder="Enter current city/place"
                  required
                />
                {renderError('place')}

                <p className="mt-4 text-sm text-ink-soft leading-relaxed bg-ink/[0.03] p-4 rounded-md border-l-2 border-ink/20">
                  By signing, you provide a legally binding digital signature affirming the declarations in this instrument.
                </p>
              </div>

              <div>
                <label className={LABEL}>Digital Signature *</label>
                <div className={fieldErrors.signature ? 'rounded-md ring-2 ring-red-400' : ''}>
                  <SignaturePad onChange={handleSignatureChange} />
                </div>
                {renderError('signature')}
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start gap-3 border-l-2 border-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div className="pt-8 border-t border-rule">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-ink hover:bg-seal text-white font-semibold py-4 px-8 rounded-md shadow-md transition-colors flex items-center justify-center gap-2.5 text-base tracking-wide disabled:opacity-50 disabled:hover:bg-ink"
            >
              <ShieldCheck className="w-5 h-5" />
              {isSubmitting ? 'Recording…' : 'Execute Authorization'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-ink-soft text-xs font-mono uppercase tracking-wider mt-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted &amp; securely processed
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
