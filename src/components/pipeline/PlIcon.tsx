import type { LucideIcon } from "lucide-react";

/* Ikon lucide dibungkus <i> agar selector CSS asli (".pl-btn i { font-size }") tetap berlaku. */
export function PlIcon({ icon: Icon, style }: { icon: LucideIcon; style?: React.CSSProperties }) {
  return (
    <i aria-hidden="true" style={style}>
      <Icon strokeWidth={2} />
    </i>
  );
}
