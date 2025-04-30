// Inspired by react-hot-toast library
import { useState, useEffect, createElement } from "react";
import type { ReactNode } from "react";

export type ToastProps = {
  id: string;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  variant?: "default" | "destructive";
};

const TOAST_LIFETIME = 5000;
let count = 0;

function generateId() {
  return `toast-${count++}`;
}

export function useToast() {
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

  function toast({ title, description, variant, action }: Omit<ToastProps, "id">) {
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
  }

  function dismiss(toastId?: string) {
    setToasts((toasts) =>
      toastId
        ? toasts.filter((t) => t.id !== toastId)
        : []
    );
  }

  return {
    toast,
    dismiss,
    toasts,
  };
} 