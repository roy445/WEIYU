"use client";

export function PrintButton({ label = "列印訂單" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-sm print-hidden">
      {label}
    </button>
  );
}
