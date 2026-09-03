import type { Metadata } from "next";

import { BrandPanel } from "@/components/auth/BrandPanel";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Indotrading AI",
};

export default function LoginPage() {
  return (
    <>
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <LoginForm />
      </div>
    </>
  );
}
