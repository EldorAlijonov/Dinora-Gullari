import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#111827',
            color: '#E5E7EB',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
          },
          success: { iconTheme: { primary: '#34D399', secondary: '#0F172A' } },
          error: { iconTheme: { primary: '#FB7185', secondary: '#0F172A' } },
        }}
      />
    </>
  );
}
