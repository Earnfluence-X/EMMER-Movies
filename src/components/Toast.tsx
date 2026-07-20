// src/components/Toast.tsx
import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: "border-green-500 bg-green-500/10",
  error: "border-red-500 bg-red-500/10",
  info: "border-blue-500 bg-blue-500/10",
  warning: "border-yellow-500 bg-yellow-500/10",
};

const TEXT_COLORS = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

export function Toast({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose,
  action 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const Icon = ICONS[type];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  if (!isVisible) return null;

  const colorClass = COLORS[type] || COLORS.info;
  const textColorClass = TEXT_COLORS[type] || TEXT_COLORS.info;

  return (
    <div 
      className={`relative overflow-hidden rounded-lg border backdrop-blur-sm shadow-2xl w-full max-w-sm animate-slide-up ${colorClass} bg-black/95`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${textColorClass}`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-white font-semibold text-sm">{title}</h4>
          )}
          <p className="text-zinc-300 text-sm mt-0.5">{message}</p>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-[#e50914] hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleClose}
          className="shrink-0 text-zinc-500 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <div 
          className={`h-full transition-all duration-100 ${textColorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Toast container
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {children}
      </div>
    </div>
  );
}