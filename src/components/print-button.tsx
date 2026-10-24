"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-sm print-hidden">
      列印訂單
    </button>
  );
}
