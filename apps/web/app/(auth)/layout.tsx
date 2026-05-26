import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/25">
            <span className="text-primary-foreground text-2xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Syncora</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-Powered Operations OS</p>
        </div>
        {children}
      </div>
    </div>
  );
}
