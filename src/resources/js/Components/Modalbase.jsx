import React from "react";

export default function ModalBase({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
          <button type="button" onClick={onClose} className="btn btnSm btnGhost">
            閉じる
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
