# PMI GOV Consent Form

A React application for capturing customer consent and payment authorization, complete with digital signatures and Aadhaar uploads.

## One-Click Deploy to Vercel

If you have exported this project to your GitHub repository, you can deploy it to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

*(Note: When importing to Vercel, make sure the framework preset is set to **Vite**).*

## Features
- **Customer Details**: Form to collect name, mobile, address, etc.
- **Identity Documents**: Upload front and back of Aadhaar card.
- **Payment Details**: Record service description, amount, payment mode, and transaction reference.
- **Digital Signature**: In-browser signature pad for customer consent.
- **Admin Panel**: View submitted forms, delete entries, and generate/download PDFs.

## Tech Stack
- React + Vite
- Tailwind CSS
- Firebase Firestore (Database)
- lucide-react (Icons)
- jspdf & dom-to-image (PDF Generation)
