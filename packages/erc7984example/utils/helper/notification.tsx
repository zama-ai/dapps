import React from "react";
import { Toast, ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

type NotificationOptions = {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

const ENUM_STATUSES = {
  success: <CheckCircleIcon className="w-7 text-[#30d158]" />,
  loading: <span className="w-6 loading loading-spinner text-[#FFD60A]"></span>,
  error: <ExclamationCircleIcon className="w-7 text-[#ff453a]" />,
  info: <InformationCircleIcon className="w-7 text-[#FFD60A]" />,
  warning: <ExclamationTriangleIcon className="w-7 text-[#FF9F0A]" />,
};

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "top-center";

/**
 * Custom Notification - Liquid Glass Style
 */
const Notification = ({
  content,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  return toast.custom(
    (t: Toast) => (
      <div
        className={`flex flex-row items-start justify-between max-w-sm min-w-[320px] rounded-2xl p-5 transform-gpu relative transition-all duration-500 ease-in-out space-x-3
        glass-card-strong border border-white/40
        shadow-[0_8px_32px_0_rgba(255,214,10,0.25),0_0_0_1px_rgba(255,255,255,0.3)_inset]
        ${
          position.substring(0, 3) == "top"
            ? `hover:translate-y-1 ${t.visible ? "top-0 opacity-100 scale-100" : "-top-96 opacity-0 scale-95"}`
            : `hover:-translate-y-1 ${t.visible ? "bottom-0 opacity-100 scale-100" : "-bottom-96 opacity-0 scale-95"}`
        }`}
        style={{
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
        }}
      >
        {/* Icon with glow effect */}
        <div className="leading-[0] self-center relative">
          <div className="absolute inset-0 blur-md opacity-50">
            {icon ? icon : ENUM_STATUSES[status]}
          </div>
          <div className="relative">
            {icon ? icon : ENUM_STATUSES[status]}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-x-hidden break-words whitespace-pre-line text-[#1d1d1f] font-medium ${icon ? "mt-1" : ""}`}>
          {content}
        </div>

        {/* Close button with glass effect */}
        <div
          className={`cursor-pointer text-lg ${icon ? "mt-1" : ""} hover:bg-white/20 rounded-lg p-1 transition-colors duration-200`}
          onClick={() => toast.dismiss(t.id)}
        >
          <XMarkIcon className="w-5 h-5 text-[#1d1d1f]/70 hover:text-[#1d1d1f]" onClick={() => toast.remove(t.id)} />
        </div>
      </div>
    ),
    {
      duration: status === "loading" ? Infinity : duration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "error", ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};
