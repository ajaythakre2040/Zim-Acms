import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatDateTime(dt: string | Date | null | undefined) {
  if (!dt) return "-";

  // Safe handling: string hai toh process karo, nahi toh direct use karo
  const dateStr = typeof dt === 'string' ? dt.replace('Z', '') : dt;
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTime(dt: string | Date | null | undefined) {
  if (!dt || dt === "N/A") return "-";

  const dateStr = typeof dt === 'string' ? dt.replace('Z', '') : dt;
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}