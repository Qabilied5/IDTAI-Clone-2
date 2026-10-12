import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/ComingSoon";

export const metadata: Metadata = {
  title: "Appointment — Indotrading AI",
};

export default function AppointmentPage() {
  return <ComingSoon title="Appointment" />;
}
