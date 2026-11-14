import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useEstate } from '../../context/EstateContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useEstate();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/30 shadow-xl transition-all"
        >
          <div className="flex items-start gap-2.5">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#FF6B4A] shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-[#78879B] shrink-0 mt-0.5" />
            )}
            {(toast.type === 'warning' || toast.type === 'error') && (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-semibold text-[#11151C] dark:text-[#F1F5F9]">
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-xs text-[#5E6D82] dark:text-[#94A3B8] mt-0.5">
                  {toast.description}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-[#78879B] hover:text-[#11151C] dark:hover:text-white transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
