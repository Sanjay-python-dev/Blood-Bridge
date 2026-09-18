import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

let toastSubscriber = null;

export const showToast = (message, type = 'success', duration = 4000) => {
  if (toastSubscriber) {
    toastSubscriber({ message, type, id: Date.now() });
    setTimeout(() => {
      if (toastSubscriber) toastSubscriber(null);
    }, duration);
  }
};

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    toastSubscriber = setToast;
    return () => {
      toastSubscriber = null;
    };
  }, []);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#FF2B2B] flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
    error: 'border-[#E50914]/60 shadow-[0_0_25px_rgba(229,9,20,0.4)]',
    warning: 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]',
    info: 'border-sky-500/40 shadow-[0_0_25px_rgba(14,165,233,0.3)]',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fadeIn pointer-events-auto">
      <div
        className={`bg-[#111111] border rounded-2xl p-4 flex items-center justify-between gap-3 text-white ${
          borders[toast.type] || borders.success
        }`}
      >
        <div className="flex items-center gap-3">
          {icons[toast.type] || icons.success}
          <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
        </div>
        <button
          onClick={() => setToast(null)}
          className="p-1 text-[#737373] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
