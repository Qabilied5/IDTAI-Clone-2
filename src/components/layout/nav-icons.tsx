import type { SVGProps } from "react";

export function IconOverview(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity=".9" />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity=".5" />
      <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity=".5" />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity=".25" />
    </svg>
  );
}

export function IconPercakapan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M3 5C3 3.9 3.9 3 5 3h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7l-4 3V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity=".1"
      />
      <line x1="7" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconAiAgent(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity=".1" />
      <path d="M4 16.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15.5" cy="5.5" r="2.2" fill="currentColor" opacity=".5" />
      <path d="M13.5 9.8a5.5 5.5 0 0 1 4 5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export function IconAnalitik(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <polyline points="2.5,15 7,9 11,12 16.5,5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.5" cy="5" r="1.8" fill="currentColor" />
      <line x1="2.5" y1="17.5" x2="17.5" y2="17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".3" />
    </svg>
  );
}

export function IconLeads(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity=".12" />
      <path d="M3.5 17c0-3.6 3-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconRevenue(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4 -6l4 2l4 -5" />
      <path d="M17 6h3v3" />
    </svg>
  );
}

export function IconAppointment(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <rect x="2.5" y="4" width="15" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity=".08" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" stroke="currentColor" strokeWidth="1.4" />
      <line x1="7" y1="2" x2="7" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="13" y1="2" x2="13" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5.5" y="11" width="3" height="3" rx=".8" fill="currentColor" opacity=".6" />
      <rect x="11.5" y="11" width="3" height="3" rx=".8" fill="currentColor" opacity=".35" />
    </svg>
  );
}

export function IconPipeline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <defs>
        <marker id="idt-nav-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <circle cx="3.5" cy="10" r="2" fill="currentColor" fillOpacity=".5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5.6" y1="10" x2="8.2" y2="10" stroke="currentColor" strokeWidth="1.3" markerEnd="url(#idt-nav-arrow)" strokeLinecap="round" />
      <rect x="8.5" y="7" width="5" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity=".08" />
      <line x1="8.5" y1="9.5" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1" opacity=".5" />
      <line x1="13.7" y1="8.5" x2="15.8" y2="6.5" stroke="currentColor" strokeWidth="1.3" markerEnd="url(#idt-nav-arrow)" strokeLinecap="round" />
      <line x1="13.7" y1="11.5" x2="15.8" y2="13.5" stroke="currentColor" strokeWidth="1.3" markerEnd="url(#idt-nav-arrow)" strokeLinecap="round" />
      <circle cx="17" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity=".6" />
      <circle cx="17" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity=".35" />
    </svg>
  );
}

export function IconIntegrasi(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="5.5" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".12" />
      <circle cx="14.5" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".12" />
      <circle cx="14.5" cy="14.5" r="2.2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".12" />
      <line x1="7.5" y1="9" x2="12.4" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7.5" y1="11" x2="12.4" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconPengaturanAgent(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <circle cx="10" cy="10" r="2.2" fill="currentColor" opacity=".7" />
      <path
        d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".07" />
    </svg>
  );
}

export function IconKnowledgeBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M5 3h7.5L15 5.5V17H5V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="currentColor" fillOpacity=".08" />
      <path d="M12.5 3v3H15" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="7.5" y1="9" x2="12.5" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7.5" y1="12" x2="12.5" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7.5" y1="14.5" x2="10.5" y2="14.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}