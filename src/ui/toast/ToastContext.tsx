/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (title: string, type?: ToastType, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Static listener for triggering toasts outside React component tree
type ToastListener = (toast: ToastItem) => void;
const staticListeners = new Set<ToastListener>();

export const notifyToast = (title: string, type: ToastType = 'info', description?: string, duration = 4000) => {
  const item: ToastItem = {
    id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    title,
    description,
    duration,
  };
  staticListeners.forEach((listener) => listener(item));
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, type: ToastType = 'info', description?: string, duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { id, type, title, description, duration };
      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 on screen

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const handleStaticToast: ToastListener = (item) => {
      setToasts((prev) => [...prev.slice(-4), item]);
      if (item.duration && item.duration > 0) {
        setTimeout(() => {
          removeToast(item.id);
        }, item.duration);
      }
    };
    staticListeners.add(handleStaticToast);
    return () => {
      staticListeners.delete(handleStaticToast);
    };
  }, [removeToast]);

  const success = useCallback((t: string, d?: string) => showToast(t, 'success', d), [showToast]);
  const error = useCallback((t: string, d?: string) => showToast(t, 'error', d), [showToast]);
  const warning = useCallback((t: string, d?: string) => showToast(t, 'warning', d), [showToast]);
  const info = useCallback((t: string, d?: string) => showToast(t, 'info', d), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Floating Toasts Viewport */}
      <div
        id="veecut-toast-container"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full select-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-[#0a1a12]/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
                : toast.type === 'error'
                ? 'bg-[#1e0d0d]/95 border-red-500/50 text-red-100 shadow-red-950/40'
                : toast.type === 'warning'
                ? 'bg-[#1e1707]/95 border-amber-500/50 text-amber-100 shadow-amber-950/40'
                : 'bg-[#0f121d]/95 border-indigo-500/40 text-zinc-100 shadow-indigo-950/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">{toast.description}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if accessed outside provider
    return {
      toasts: [],
      showToast: (t, type, d, dur) => notifyToast(t, type, d, dur),
      removeToast: () => {},
      success: (t, d) => notifyToast(t, 'success', d),
      error: (t, d) => notifyToast(t, 'error', d),
      warning: (t, d) => notifyToast(t, 'warning', d),
      info: (t, d) => notifyToast(t, 'info', d),
    };
  }
  return ctx;
};
