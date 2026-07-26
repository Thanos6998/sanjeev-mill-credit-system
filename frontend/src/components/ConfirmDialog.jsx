import React from "react";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="confirm-dialog">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative paper-surface border border-[#C5A059] w-full max-w-md shadow-xl soft-in">
        <div className="p-5 border-b border-[#E2D9C8]">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#B33A3A]">Confirm action</div>
          <h3 className="font-serif-display text-2xl mt-1 text-[#2C2825]">{title}</h3>
        </div>
        <div className="p-5 text-sm text-[#5C544D]">{description}</div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[#E2D9C8]">
          <button onClick={onCancel} className="btn-ghost" data-testid="confirm-cancel-btn">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            data-testid="confirm-proceed-btn"
            className={destructive ? "btn-maroon" : "btn-maroon"}
            style={destructive ? { backgroundColor: "#B33A3A", borderColor: "#B33A3A" } : {}}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
