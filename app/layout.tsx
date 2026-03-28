import './globals.css';
import { Toaster } from 'react-hot-toast';
import NavBar from '@/components/NavBar';
import { RealtimeProvider } from '@/components/RealtimeProvider';

export const metadata = {
  title: {
    template: 'Nexus — %s',
    default: 'Nexus — Vendor Onboarding Platform',
  },
  description: 'AI-powered vendor onboarding and compliance management platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">
          <RealtimeProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'font-dm text-sm',
                style: { borderRadius: '12px', padding: '12px 16px' },
                success: { style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' } },
                error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
              }}
            />
            <NavBar />
            {children}
          </RealtimeProvider>
        </div>
      </body>
    </html>
  );
}
