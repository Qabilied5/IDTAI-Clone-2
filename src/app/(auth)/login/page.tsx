import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Indotrading AI",
};

export default function LoginPage() {
  return <LoginForm />;
}