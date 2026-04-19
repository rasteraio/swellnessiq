'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right ${
              toast.type === 'success' ? 'bg-green-50 border-green-200' :
              toast.type === 'error' ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            <p className="text-sm text-slate-700 flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 min-h-0 min-w-0 w-5 h-5 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
