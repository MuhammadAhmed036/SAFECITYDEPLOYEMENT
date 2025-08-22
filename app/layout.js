// app/layout.jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import Script from 'next/script';
import NavGuard from './components/NavGuard';

export const metadata = {
  title: 'Safe City',
  description: 'Map with clustering',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <NavGuard /> {/* Navbar hidden on /dashboard */}
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" />
      </body>
    </html>
  );
}
