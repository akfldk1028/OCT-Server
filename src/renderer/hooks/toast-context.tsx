import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ToastProps = {
  id: string;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "error";
};

const TOAST_LIFETIME = 5000;
let count = 0;
function generateId() {
  return `toast-${count++}`;
}

type ToastContextType = {
  toasts: ToastProps[];
  toast: (toast: Omit<ToastProps, "id">) => { id: string; dismiss: () => void; update: (props: Omit<ToastProps, "id">) => void };
  dismiss: (toastId?: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const timeouts = toasts.map((toast) => {
      return setTimeout(() => {
        setToasts((toasts) => toasts.filter((t) => t.id !== toast.id));
      }, TOAST_LIFETIME);
    });
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [toasts]);

  const toast = useCallback(({ title, description, variant, action }: Omit<ToastProps, "id">) => {
    const id = generateId();
    const newToast = { id, title, description, variant, action };
    setToasts((toasts) => [...toasts, newToast]);
    return {
      id,
      dismiss: () => setToasts((toasts) => toasts.filter((t) => t.id !== id)),
      update: (props: Omit<ToastProps, "id">) =>
        setToasts((toasts) =>
          toasts.map((t) => (t.id === id ? { ...t, ...props } : t))
        ),
    };
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    setToasts((toasts) =>
      toastId
        ? toasts.filter((t) => t.id !== toastId)
        : []
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
} 