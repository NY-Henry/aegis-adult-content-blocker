import React, { useState, useEffect, useRef } from "react";
import { Lock, X } from "lucide-react";
import { useDialogFocus } from "../useDialogFocus";

interface PinModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  isNewPin?: boolean;
  onConfirm: (pin: string, newPin?: string) => Promise<void>;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  title,
  subtitle,
  isNewPin = false,
  onConfirm,
  onClose,
}) => {
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, isOpen, onClose, loading);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setNewPin("");
      setConfirmPin("");
      setError(null);
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNewPin) {
      if (newPin.length < 4) {
        setError("New PIN must be at least 4 characters");
        return;
      }
      if (newPin !== confirmPin) {
        setError("New PIN and confirmation do not match");
        return;
      }
    } else {
      if (!pin.trim()) {
        setError("Please enter your PIN");
        return;
      }
    }

    try {
      setLoading(true);
      if (isNewPin) {
        await onConfirm(pin, newPin);
      } else {
        await onConfirm(pin);
      }
      onClose();
    } catch (err: any) {
      setError(typeof err === "string" ? err : err?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} className="modal-container" role="dialog" aria-modal="true" aria-labelledby="pin-dialog-title">
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Lock size={18} />
            </div>
            <h3 id="pin-dialog-title">{title}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={loading} aria-label="Close PIN dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {subtitle && <p className="modal-subtitle">{subtitle}</p>}

          {error && <div className="modal-error-box">{error}</div>}

          {isNewPin ? (
            <div className="pin-inputs-grid">
              <div className="input-group">
                <label htmlFor="current-pin">Current PIN (if set)</label>
                <input
                  ref={pinInputRef}
                  id="current-pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Leave blank if no PIN"
                  className="text-input"
                />
              </div>

              <div className="input-group">
                <label htmlFor="new-pin">New PIN (min 4 characters)</label>
                <input
                  type="password"
                  id="new-pin"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="text-input"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirm-pin">Confirm new PIN</label>
                <input
                  type="password"
                  id="confirm-pin"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  className="text-input"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="input-group single-pin">
              <label htmlFor="security-pin">Enter security PIN</label>
              <input
                ref={pinInputRef}
                id="security-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="text-input pin-big"
                autoFocus
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
