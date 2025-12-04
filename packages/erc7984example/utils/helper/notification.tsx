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
  success: <CheckCircleIcon className="w-7 text-[#A38025]" />,
  loading: <span className="w-6 loading loading-spinner text-[#FFD208]"></span>,
  error: <ExclamationCircleIcon className="w-7 text-[#2D2D2D]" />,
  info: <InformationCircleIcon className="w-7 text-[#FFD208]" />,
  warning: <ExclamationTriangleIcon className="w-7 text-[#A38025]" />,
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
        className={`flex flex-row items-start justify-between max-w-sm min-w-[320px] p-5 transform-gpu relative transition-all duration-500 ease-in-out space-x-3
        bg-[#E8E8E8] border border-[#2D2D2D]
        ${
          position.substring(0, 3) == "top"
            ? `hover:translate-y-1 ${t.visible ? "top-0 opacity-100 scale-100" : "-top-96 opacity-0 scale-95"}`
            : `hover:-translate-y-1 ${t.visible ? "bottom-0 opacity-100 scale-100" : "-bottom-96 opacity-0 scale-95"}`
        }`}
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
        <div className={`flex-1 overflow-x-hidden break-words whitespace-pre-line text-[#2D2D2D] font-medium ${icon ? "mt-1" : ""}`}>
          {content}
        </div>

        {/* Close button */}
        <div
          className={`cursor-pointer text-lg ${icon ? "mt-1" : ""} hover:bg-[#D9D9D9] p-1 transition-colors duration-200`}
          onClick={() => toast.dismiss(t.id)}
        >
          <XMarkIcon className="w-5 h-5 text-[#2D2D2D]/70 hover:text-[#2D2D2D]" onClick={() => toast.remove(t.id)} />
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
