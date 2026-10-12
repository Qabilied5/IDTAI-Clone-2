"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface TicketModalProps {
  contactName: string;
  onClose: () => void;
  onSubmit: (ticket: { title: string; priority: string; assignee: string; note: string }) => void;
}

const PRIORITIES = ["Medium", "High", "Low"];
const ASSIGNEES = ["Agen Support — Ahmad R.", "Agen Support — Sari D.", "Belum ditentukan"];

export function TicketModal({ contactName, onClose, onSubmit }: TicketModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [assignee, setAssignee] = useState(ASSIGNEES[0]);
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[10px] bg-canvas p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Buat Tiket Support</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Judul Tiket</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Keluhan dari ${contactName}`}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Prioritas</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Assignee</label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            >
              {ASSIGNEES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Catatan</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Customer mengeluhkan keterlambatan pengiriman order #12984."
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-xs text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[7px] border border-border px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-panel"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ title, priority, assignee, note })}
            disabled={!title.trim()}
            className="rounded-[7px] bg-accent px-3.5 py-1.5 text-xs font-semibold text-canvas hover:bg-accent-strong disabled:opacity-50"
          >
            Buat Tiket
          </button>
        </div>
      </div>
    </div>
  );
}
