import PDFDocument from 'pdfkit';
import { imageSize } from 'image-size';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface FormRecord {
  date: string | null;
  customerName: string;
  fatherSpouseName: string | null;
  address: string | null;
  mobileNumber: string;
  emailId: string | null;
  serviceDescription: string | null;
  amountPayable: string | null;
  modeOfPayment: string | null;
  transactionRef: string | null;
  paymentDate: string | null;
  place: string | null;
}

export interface PdfImage {
  buffer: Buffer;
  contentType: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPI_QR_PATH = path.resolve(__dirname, 'assets/upi-qr.jpeg');
const brandLogoPath = path.join(__dirname, '..', 'assets', 'logo.png');

const PMI_BANK_DETAILS = {
  bankName: 'AXIS BANK',
  accountHolderName: 'PMI SERVICES ENTERPRISES',
  accountNumber: '926020017030914',
  ifscCode: 'UTIB0001398',
  branch: 'Tikamgarh',
};

const PMI_UPI_ID = '7460070899@ptaxis';

const CONSENT_ITEMS = [
  'I have been informed about the nature, scope, and charges of the services provided by PMI Services and have no objection to making payment for the same.',
  'I understand and accept all applicable fees, taxes, and other charges relating to the services availed.',
  'I voluntarily authorize PMI Services to receive and process my payment through the agreed mode of payment.',
  'I confirm that the funds used for making payment belong to me and are derived from lawful sources.',
  'I understand that any refund, cancellation, or adjustment, if applicable, shall be governed by the terms and conditions of PMI Services.',
  'I declare that all information and documents furnished by me are true, accurate, and complete to the best of my knowledge.',
  'I agree that PMI Services shall not be held liable for any loss, delay, or issue arising from incorrect information provided by me or from unauthorized use of my payment instrument.',
  'I expressly agree that any dispute, claim, difference, or legal proceeding arising out of or relating to the services provided, this consent form, or any payment transaction shall be subject to the exclusive jurisdiction of the competent courts at Tikamgarh, Madhya Pradesh, and no other court shall have jurisdiction in such matters.',
];

const DECLARATION =
  '"I have carefully read and understood the contents of this Consent and Payment Authorization Form. I voluntarily execute this document and provide my consent without any coercion, undue influence, or misrepresentation."';

// PDFKit's standard fonts only support PNG/JPEG embedding.
function embeddable(img: PdfImage | null): img is PdfImage {
  return Boolean(img && /^image\/(png|jpe?g)$/.test(img.contentType));
}

function drawPdfHeader(doc: PDFKit.PDFDocument, x: number, width: number) {
  const logoSize = 52;
  const headerTop = doc.page.margins.top;
  const centerX = x + width / 2;

  if (fs.existsSync(brandLogoPath)) {
    doc.image(brandLogoPath, centerX - logoSize / 2, headerTop, {
      fit: [logoSize, logoSize],
      align: 'center',
      valign: 'center',
    });
    doc.y = headerTop + logoSize + 10;
  } else {
    doc.y = headerTop;
  }

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a');
  doc.text('PMI SERVICES', x, doc.y, { width, align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor('#334155');
  doc.text('CUSTOMER CONSENT AND PAYMENT AUTHORIZATION FORM', { align: 'center' });
  doc.moveDown(0.5);
  doc
    .moveTo(x, doc.y)
    .lineTo(x + width, doc.y)
    .lineWidth(2)
    .strokeColor('#0f172a')
    .stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a8a').text(title.toUpperCase());
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + doc.widthOfString(title.toUpperCase()) + 10, y)
    .lineWidth(1.5)
    .strokeColor('#1e3a8a')
    .stroke();
  doc.moveDown(0.8);
}

function fieldTable(doc: PDFKit.PDFDocument, rows: [string, string | null][]) {
  const x = doc.page.margins.left;
  const width = doc.page.width - x - doc.page.margins.right;
  const labelWidth = width * 0.35;

  for (const [label, value] of rows) {
    const text = value?.trim() || '-';
    doc.fontSize(9);
    const labelHeight = doc
      .font('Helvetica-Bold')
      .heightOfString(label, { width: labelWidth - 16 });
    doc.fontSize(10);
    const valueHeight = doc
      .font('Helvetica-Bold')
      .heightOfString(text, { width: width - labelWidth - 16 });
    const rowHeight = Math.max(labelHeight, valueHeight) + 12;

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    const y = doc.y;

    doc.lineWidth(0.75).strokeColor('#94a3b8');
    doc.rect(x, y, labelWidth, rowHeight).fillAndStroke('#f1f5f9', '#94a3b8');
    doc.rect(x + labelWidth, y, width - labelWidth, rowHeight).stroke();

    doc
      .fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(label, x + 8, y + 6, { width: labelWidth - 16 });
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(text, x + labelWidth + 8, y + 6, { width: width - labelWidth - 16 });

    doc.x = x;
    doc.y = y + rowHeight;
  }
}

export interface VerificationMeta {
  contentHash?: string | null;
  submittedAt?: Date | string | null;
}

export function buildFormPdf(
  form: FormRecord,
  images: {
    signature: PdfImage | null;
    aadhaarFront: PdfImage | null;
    aadhaarBack: PdfImage | null;
    panCard: PdfImage | null;
  },
  verification?: VerificationMeta,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const x = doc.page.margins.left;
  const width = doc.page.width - x - doc.page.margins.right;

  drawPdfHeader(doc, x, width);

  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  doc.text(`Date: ${form.date || '-'}`, { align: 'right' });

  // Customer details
  sectionTitle(doc, 'Customer Details');
  fieldTable(doc, [
    ['Customer Name', form.customerName],
    ["Father's/Spouse's Name", form.fatherSpouseName],
    ['Address', form.address],
    ['Mobile Number', form.mobileNumber],
    ['Email ID', form.emailId],
  ]);

  // Identity documents: front, back, and PAN side by side, below customer details.
  if (embeddable(images.aadhaarFront) || embeddable(images.aadhaarBack) || embeddable(images.panCard)) {
    sectionTitle(doc, 'Identity Documents');
    const gap = 16;
    const colWidth = (width - gap * 2) / 3;
    const maxImageHeight = 200;
    const startY = doc.y;
    const columns: [string, PdfImage | null, number][] = [
      ['Aadhaar Card (Front)', images.aadhaarFront, x],
      ['Aadhaar Card (Back)', images.aadhaarBack, x + colWidth + gap],
      ['PAN Card', images.panCard, x + (colWidth + gap) * 2],
    ];
    // Advance by the tallest actually-rendered image, not the max box, so no
    // dead space is reserved below landscape card photos.
    let tallest = 0;
    for (const [label, img, colX] of columns) {
      if (!embeddable(img)) continue;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569');
      doc.text(label, colX, startY, { width: colWidth });
      doc.image(img.buffer, colX, startY + 18, {
        fit: [colWidth, maxImageHeight],
        align: 'center',
      });
      let rendered = maxImageHeight;
      try {
        const dims = imageSize(img.buffer);
        if (dims.width && dims.height) {
          const scale = Math.min(colWidth / dims.width, maxImageHeight / dims.height, 1);
          rendered = dims.height * scale;
        }
      } catch {
        // Unknown dimensions — keep the conservative full box height.
      }
      tallest = Math.max(tallest, rendered);
    }
    doc.x = x;
    doc.y = startY + 18 + (tallest || maxImageHeight);
  }

  // Consent declaration flows right after — only break if the remaining space
  // can't fit the title plus a couple of lines.
  if (doc.y + 140 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  sectionTitle(doc, 'Consent Declaration');
  doc.font('Helvetica').fontSize(9.5).fillColor('#1f2937');
  doc.text(
    `I, ${form.customerName}, hereby confirm that I have voluntarily availed/requested services from PMI Services and agree to make payment for the services provided. I further declare and consent to the following:`,
    { align: 'justify' },
  );
  doc.moveDown(0.5);
  CONSENT_ITEMS.forEach((item, i) => {
    doc.text(`${i + 1}.  ${item}`, x + 10, doc.y, {
      width: width - 10,
      align: 'justify',
    });
    doc.moveDown(0.35);
    doc.x = x;
  });

  // Payment details
  sectionTitle(doc, 'Payment Details');
  fieldTable(doc, [
    ['Select Certification', form.serviceDescription],
    ['Amount Payable', form.amountPayable ? `Rs. ${form.amountPayable}` : null],
    ['Mode of Payment', form.modeOfPayment],
    ['Transaction Reference No.', form.transactionRef],
    ['Date of Payment', form.paymentDate],
  ]);

  // Bank account details + UPI QR, side by side.
  if (doc.y + 200 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  sectionTitle(doc, 'Bank Account Details');
  const bankStartY = doc.y;
  const qrColWidth = 140;
  const bankColWidth = width - qrColWidth - 20;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
  doc.text('PMI Services', x, bankStartY, { width: bankColWidth });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).fillColor('#334155');
  const bankLines: [string, string][] = [
    ['Bank Name', PMI_BANK_DETAILS.bankName],
    ['Account Holder Name', PMI_BANK_DETAILS.accountHolderName],
    ['Account Number', PMI_BANK_DETAILS.accountNumber],
    ['IFSC Code', PMI_BANK_DETAILS.ifscCode],
    ['Branch', PMI_BANK_DETAILS.branch],
  ];
  for (const [label, value] of bankLines) {
    doc.text(`${label}: `, x, doc.y, { continued: true, width: bankColWidth });
    doc.font('Helvetica-Bold').text(value, { width: bankColWidth });
    doc.font('Helvetica');
  }
  const bankBlockBottom = doc.y;

  const qrX = x + width - qrColWidth;
  let qrBottom = bankStartY;
  if (fs.existsSync(UPI_QR_PATH)) {
    try {
      const qrBuffer = fs.readFileSync(UPI_QR_PATH);
      doc.image(qrBuffer, qrX, bankStartY, { fit: [qrColWidth, qrColWidth] });
      qrBottom = bankStartY + qrColWidth;
    } catch {
      // Fall through — still show the UPI ID as text below.
    }
  }
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
  doc.text(PMI_UPI_ID, qrX, qrBottom + 6, { width: qrColWidth, align: 'center' });
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
  doc.text('Scan with any UPI app', qrX, doc.y + 2, { width: qrColWidth, align: 'center' });

  doc.x = x;
  doc.y = Math.max(bankBlockBottom, doc.y) + 8;

  // Customer declaration + signature
  if (doc.y + 240 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  sectionTitle(doc, 'Customer Declaration');
  doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#1f2937');
  doc.text(DECLARATION, { align: 'justify' });
  doc.moveDown(1.5);

  const blockY = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  doc.text(`Place: ${form.place || '-'}`, x, blockY);
  doc.moveDown(0.6);
  doc.text(`Date: ${form.date || '-'}`);

  const sigX = x + width - 200;
  if (embeddable(images.signature)) {
    doc.image(images.signature.buffer, sigX, blockY, { fit: [200, 80] });
  }
  const lineY = blockY + 88;
  doc
    .moveTo(sigX, lineY)
    .lineTo(sigX + 200, lineY)
    .lineWidth(0.75)
    .strokeColor('#64748b')
    .stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
  doc.text(form.customerName, sigX, lineY + 6, { width: 200, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('CUSTOMER SIGNATURE', sigX, doc.y + 2, { width: 200, align: 'center' });
  doc.x = x;
  doc.y = Math.max(doc.y, lineY + 40);

  // Tamper-evidence stamp: binds this document's fields + images to a hash
  // recorded at submission. Any later edit changes the hash on re-verification.
  if (verification?.contentHash) {
    if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    doc.moveDown(1.5);
    const stampY = doc.y;
    doc.lineWidth(0.75).strokeColor('#cbd5e1');
    doc.moveTo(x, stampY).lineTo(x + width, stampY).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569');
    doc.text('DOCUMENT INTEGRITY VERIFICATION', x, doc.y, { width });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    const submitted =
      verification.submittedAt instanceof Date
        ? verification.submittedAt.toISOString()
        : verification.submittedAt || '-';
    doc.text(`Submitted at (UTC): ${submitted}`, { width });
    doc.text(`SHA-256: ${verification.contentHash}`, { width });
    doc.text(
      'This form and its attached documents are bound to the hash above. Any alteration changes the hash on re-verification.',
      { width },
    );
  }

  return doc;
}
