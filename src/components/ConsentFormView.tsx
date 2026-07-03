import React from 'react';
import { Building2, ShieldCheck, FileSignature, CheckCircle2 } from 'lucide-react';

export function ConsentFormView({ formData }: { formData: any }) {
  return (
    <div className="bg-white" id="pdf-content">
      <div className="text-center mb-10 pb-6 border-b-2 border-gray-900">
        <div className="flex justify-center items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-blue-800" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">PMI SERVICES ENTERPRISES</h1>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-700 uppercase mt-2">
          Customer Consent and Payment Authorization Form
        </h2>
      </div>

      <div className="space-y-8">
        {/* Customer Details */}
        <section className="print-avoid-break">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold text-blue-900 border-b-2 border-blue-900 pb-1 inline-block uppercase tracking-wide">Customer Details</h3>
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Date:</span>
              <span className="font-bold min-w-[120px] border-b border-gray-400 pb-1 inline-block text-center">{formData.date}</span>
            </div>
          </div>
          
          <div className="border border-gray-400 mt-4 rounded-lg overflow-hidden print-no-border-radius">
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Customer Name</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.customerName}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Father's/Spouse's Name</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.fatherSpouseName}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Address</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.address}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Mobile Number</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.mobileNumber}</div>
            </div>
            <div className="flex">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Email ID</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.emailId}</div>
            </div>
          </div>
        </section>

        {/* Identity Documents */}
        {(formData.aadhaarFront || formData.aadhaarBack) && (
          <section className="print-avoid-break">
            <h3 className="text-lg font-bold text-blue-900 border-b-2 border-blue-900 pb-1 inline-block uppercase tracking-wide mb-4">Identity Documents</h3>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-4">
              {formData.aadhaarFront && (
                <div className="flex-1 max-w-sm">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Aadhaar (Front)</p>
                  <img src={formData.aadhaarFront} alt="Aadhaar Front" className="w-full h-auto border border-gray-300 rounded-lg shadow-sm" />
                </div>
              )}
              {formData.aadhaarBack && (
                <div className="flex-1 max-w-sm">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Aadhaar (Back)</p>
                  <img src={formData.aadhaarBack} alt="Aadhaar Back" className="w-full h-auto border border-gray-300 rounded-lg shadow-sm" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Consent Declaration */}
        <section className="print-avoid-break bg-gray-50 p-6 rounded-lg border border-gray-200 print-no-border">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-800" />
            <h3 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Consent Declaration</h3>
          </div>
          
          <p className="mb-4 text-gray-800 leading-relaxed font-medium">
            I, <span className="font-bold underline underline-offset-4 decoration-gray-400 px-2">{formData.customerName || '________________________'}</span>, hereby confirm that I have voluntarily availed/requested services from PMI Services Enterprises and agree to make payment for the services provided. I further declare and consent to the following:
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-gray-700 text-sm sm:text-base text-justify">
            <li>I have been informed about the nature, scope, and charges of the services provided by PMI Services Enterprises and have no objection to making payment for the same.</li>
            <li>I understand and accept all applicable fees, taxes, and other charges relating to the services availed.</li>
            <li>I voluntarily authorize PMI Services Enterprises to receive and process my payment through the agreed mode of payment.</li>
            <li>I confirm that the funds used for making payment belong to me and are derived from lawful sources.</li>
            <li>I understand that any refund, cancellation, or adjustment, if applicable, shall be governed by the terms and conditions of PMI Services Enterprises.</li>
            <li>I declare that all information and documents furnished by me are true, accurate, and complete to the best of my knowledge.</li>
            <li>I agree that PMI Services Enterprises shall not be held liable for any loss, delay, or issue arising from incorrect information provided by me or from unauthorized use of my payment instrument.</li>
            <li>I expressly agree that any dispute, claim, difference, or legal proceeding arising out of or relating to the services provided, this consent form, or any payment transaction shall be subject to the exclusive jurisdiction of the competent courts at Tikamgarh, Madhya Pradesh, and no other court shall have jurisdiction in such matters.</li>
          </ol>
        </section>

        {/* Payment Details */}
        <section className="print-avoid-break">
          <h3 className="text-lg font-bold text-blue-900 border-b-2 border-blue-900 pb-1 inline-block uppercase tracking-wide mb-4">Payment Details</h3>
          
          <div className="border border-gray-400 mt-4 rounded-lg overflow-hidden print-no-border-radius">
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Service Description</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.serviceDescription}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Amount Payable</div>
              <div className="w-2/3 p-2 text-sm font-bold">₹ {formData.amountPayable}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Mode of Payment</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.modeOfPayment}</div>
            </div>
            <div className="flex border-b border-gray-400">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Transaction Ref. No.</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.transactionRef}</div>
            </div>
            <div className="flex">
              <div className="w-1/3 bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-r border-gray-400">Date of Payment</div>
              <div className="w-2/3 p-2 text-sm font-bold">{formData.paymentDate}</div>
            </div>
          </div>
        </section>

        {/* Customer Declaration & Signature */}
        <section className="print-avoid-break mt-12 pt-8 border-t-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <FileSignature className="w-5 h-5 text-blue-800" />
            <h3 className="text-lg font-bold text-blue-900 uppercase tracking-wide">Customer Declaration</h3>
          </div>
          
          <p className="mb-8 text-gray-800 leading-relaxed font-medium italic">
            "I have carefully read and understood the contents of this Consent and Payment Authorization Form. I voluntarily execute this document and provide my consent without any coercion, undue influence, or misrepresentation."
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Place:</label>
                <div className="font-bold text-lg border-b border-gray-300 pb-1 min-h-[32px]">{formData.place}</div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date:</label>
                <div className="font-bold text-lg border-b border-gray-300 pb-1 min-h-[32px]">{formData.date}</div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              {formData.signatureUrl && (
                <div className="w-64 h-32 flex items-center justify-center border-b border-gray-400 mb-2">
                  <img src={formData.signatureUrl} alt="Customer Signature" className="max-h-full" />
                </div>
              )}
              {!formData.signatureUrl && (
                <div className="w-64 h-32 border-b border-gray-400 mb-2"></div>
              )}
              <div className="text-center">
                <div className="font-bold text-lg mb-1">{formData.customerName || '________________________'}</div>
                <div className="text-sm font-semibold text-gray-600 uppercase">Customer Signature</div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <div className="mt-12 text-center text-xs text-gray-400 no-print">
        Securely Generated via PMI GOV Authorization System
      </div>
    </div>
  );
}
