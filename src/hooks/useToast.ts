import { useState, useCallback, useMemo } from "react";
import { ToastType } from "../components/Toast";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", options?: {
      title?: string;
      duration?: number;
      action?: { label: string; onClick: () => void };
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = {
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

  const promise = useCallback(
    async <T>(
      promiseFn: () => Promise<T>,
      {
        loading = "Loading...",
        success = "Success!",
        error = "Something went wrong",
      }: {
        loading?: string;
        success?: string;
        error?: string;
      }
    ): Promise<T> => {
      const toastId = showToast(loading, "info", { duration: 0 });
      
      try {
        const result = await promiseFn();
        removeToast(toastId);
        showToast(success, "success");
        return result;
      } catch (err) {
        removeToast(toastId);
        showToast(
          typeof error === "string" ? error : "Something went wrong",
          "error"
        );
        throw err;
      }
    },
    [showToast, removeToast]
  );

  return useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      clearToasts,
      success,
      error,
      info,
      warning,
      promise,
    }),
    [toasts, showToast, removeToast, clearToasts, success, error, info, warning, promise]
  );
}