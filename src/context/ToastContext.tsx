import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast, ToastContainer, ToastType } from "../components/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: {
    title?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
  }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: any) => string;
  error: (message: string, options?: any) => string;
  info: (message: string, options?: any) => string;
  warning: (message: string, options?: any) => string;
}

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", options?: {
      title?: string;
      duration?: number;
      action?: { label: string; onClick: () => void };
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration || 5000,
        action: options?.action,
      };
      
      setToasts(prev => [...prev, toast]);
      
      // Auto-remove if duration is set
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration + 100);
      }
      
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, options?: { title?: string; duration?: number; action?: any }) => {
      return showToast(message, "success", options);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: { title?: string; duration?: number; action?: any }) => {
      return showToast(message, "error", options);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: { title?: string; duration?: number; action?: any }) => {
      return showToast(message, "info", options);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: { title?: string; duration?: number; action?: any }) => {
      return showToast(message, "warning", options);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        removeToast,
        clearToasts,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={removeToast}
            action={toast.action}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}