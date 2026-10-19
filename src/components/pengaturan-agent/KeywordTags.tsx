"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

/** Input tag: Enter / koma menambah, Backspace di input kosong menghapus yang terakhir. */
export function KeywordTags({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const kw = raw.trim().replace(/,$/, "").trim();
    if (kw && !value.includes(kw)) onChange([...value, kw]);
    setDraft("");
  };

  return (
    <div
      className="pa-tags-wrap"
      role="group"
      aria-label="Kata kunci eskalasi"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((kw, i) => (
        <span key={kw} className="pa-tag-chip">
          {kw}
          <X
            aria-label={`Hapus ${kw}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((_, idx) => idx !== i));
            }}
          />
        </span>
      ))}
      <input
        ref={inputRef}
        className="pa-tag-input"
        value={draft}
        placeholder={value.length === 0 ? "Tambah kata kunci..." : ""}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
}
