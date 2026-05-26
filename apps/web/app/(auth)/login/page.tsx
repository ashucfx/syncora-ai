import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Login — Syncora" };

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your Syncora workspace
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <a href="/register" className="text-primary hover:underline font-medium">
          Create workspace
        </a>
      </p>
    </div>
  );
}
