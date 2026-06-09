"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "削除",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  let result = null;

  if (!open) {
    return result;
  }

  result = (
    <div className="manage-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="manage-dialog"
        role="alertdialog"
        aria-labelledby="manage-dialog-title"
        aria-describedby="manage-dialog-message"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 id="manage-dialog-title">{title}</h2>
        <p id="manage-dialog-message">{message}</p>
        <div className="manage-dialog__actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="manage-dialog__danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
  return result;
}
