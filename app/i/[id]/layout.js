export const metadata = {
  title: 'Invoice · Filey',
  description: 'View this Filey invoice — UAE FTA-ready, includes TRN and 5% VAT.',
  openGraph: {
    title: 'Invoice · Filey',
    description: 'FTA-ready UAE invoice generated with Filey.',
    type: 'website',
  },
  robots: { index: false, follow: false },
};

export default function PublicInvoiceLayout({ children }) {
  return (
    <>
      {/* Wrapped in Suspense by parent layout — this is a leaf */}
      {children}
    </>
  );
}
