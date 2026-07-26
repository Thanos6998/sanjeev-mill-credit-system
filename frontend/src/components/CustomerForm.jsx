import React, { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { X, ImagePlus } from "lucide-react";

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file, maxSize = 480, quality = 0.75) {
  const dataUrl = await fileToBase64(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function CustomerForm({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Please pick an image file"); return; }
    const compressed = await compressImage(f);
    setPhoto(compressed);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payload = { name: name.trim(), phone: phone.trim(), address: address.trim(), photo };
      let res;
      if (initial?.id) {
        res = await api.patch(`/customers/${initial.id}`, payload);
      } else {
        res = await api.post("/customers", payload);
      }
      onSaved(res.data);
    } catch (er) {
      setErr(formatApiError(er));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="customer-form-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative paper-surface border border-[#C5A059] w-full max-w-lg shadow-xl soft-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2D9C8]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#5C544D]">
              {initial ? "Edit" : "New"} entry
            </div>
            <h3 className="font-serif-display text-2xl text-[#2C2825]">
              {initial ? "Edit customer" : "Add a customer"}
            </h3>
          </div>
          <button onClick={onClose} data-testid="customer-form-close-btn" aria-label="Close">
            <X className="w-5 h-5 text-[#5C544D]" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border border-[#E2D9C8] overflow-hidden paper-warm flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-6 h-6 text-[#C5A059]" />
              )}
            </div>
            <label className="btn-ghost cursor-pointer inline-flex items-center gap-2" data-testid="customer-photo-picker">
              <input type="file" accept="image/*" onChange={onPickFile} className="hidden" data-testid="customer-photo-input" />
              <ImagePlus className="w-4 h-4" /> {photo ? "Change photo" : "Upload photo"}
            </label>
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="text-xs text-[#B33A3A] uppercase tracking-widest" data-testid="customer-photo-remove-btn">
                Remove
              </button>
            )}
          </div>

          <Field label="Full name" required>
            <input
              data-testid="customer-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-[#E2D9C8] bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              data-testid="customer-phone-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[#E2D9C8] bg-white px-3 py-2 font-mono-num text-sm"
            />
          </Field>
          <Field label="Address">
            <textarea
              data-testid="customer-address-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full border border-[#E2D9C8] bg-white px-3 py-2 text-sm"
            />
          </Field>

          {err && <div className="chip-due px-3 py-2 text-sm" data-testid="customer-form-error">{err}</div>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2D9C8]">
            <button type="button" onClick={onClose} className="btn-ghost" data-testid="customer-form-cancel-btn">Cancel</button>
            <button type="submit" className="btn-maroon" disabled={saving} data-testid="customer-form-save-btn">
              {saving ? "Saving…" : initial ? "Save changes" : "Add customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[#5C544D] mb-1.5">
        {label} {required && <span className="text-[#B33A3A]">*</span>}
      </label>
      {children}
    </div>
  );
}
