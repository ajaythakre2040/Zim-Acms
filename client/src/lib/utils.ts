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
export const capitalizeFirst = (str: string | undefined | null) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export function exportCSV(fileName: string, data: any[]) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((field) => {
      let value = row[field];
      if (value === null || value === undefined) value = "";
      else if (typeof value === "object") value = JSON.stringify(value);
      value = String(value).replace(/"/g, '""');
      return `"${value}"`;
    }).join(",")
  );
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
}