import type { SVGProps } from "react";

export function IconTelegram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity=".08" />
      <path
        d="M5.2 10.1 14 6.3c.4-.17.8.13.68.55l-1.5 7.05c-.1.46-.63.66-1 .38l-2.24-1.7-1.1 1.05c-.13.12-.34.08-.4-.08l-.7-1.98-2.4-.79c-.3-.1-.32-.53-.04-.68Z"
        fill="currentColor"
        fillOpacity=".9"
      />
      <path d="M7.5 12.5 8.4 15l.98-1.86-1.88-2.3Z" fill="currentColor" opacity=".5" />
    </svg>
  );
}

export function IconWhatsapp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 2.5a7.3 7.3 0 0 0-6.3 11l-1 3.5 3.6-1a7.3 7.3 0 1 0 3.7-13.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity=".08"
      />
      <path
        d="M7 6.9c.15-.35.3-.35.45-.36h.36c.14 0 .3-.02.45.35.17.4.6 1.44.65 1.55.05.1.08.23.02.36-.06.13-.1.2-.2.3-.1.12-.2.2-.3.32-.1.1-.2.2-.1.4.12.2.55.9 1.18 1.46.8.72 1.48 1 1.7 1.1.2.1.32.08.45-.05.13-.13.55-.63.7-.85.14-.2.28-.18.48-.1.2.07 1.25.6 1.47.7.2.1.35.15.4.24.06.1.06.55-.13 1.08-.2.53-1.1 1.02-1.5 1.06-.4.05-.9.07-1.44-.09-.33-.1-.75-.24-1.3-.47-2.26-.98-3.75-3.27-3.87-3.42-.1-.16-.9-1.2-.9-2.3 0-1.08.55-1.6.75-1.83Z"
        fill="currentColor"
        fillOpacity=".9"
      />
    </svg>
  );
}
