import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          background: 'white',
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          fontSize: '14px',
        },
        className: 'toast-custom',
      }}
    />
  );
}
