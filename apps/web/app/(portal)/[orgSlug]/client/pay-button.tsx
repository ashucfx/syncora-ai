"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

interface PayButtonProps {
  invoiceId: string;
}

export function PayButton({ invoiceId }: PayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: providers, isLoading: isLoadingProviders } =
    api.billing.getActivePaymentProviders.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  const checkoutMutation = api.billing.createPortalCheckoutSession.useMutation({
    onSuccess: (data) => {
      // Redirect to host checkout page
      window.location.href = data.paymentUrl;
    },
    onError: (error) => {
      setErrorMessage(error.message || "Failed to initiate payment session.");
      setIsRedirecting(false);
    },
  });

  const handlePay = (provider: "STRIPE" | "RAZORPAY" | "PAYPAL") => {
    setErrorMessage(null);
    setIsRedirecting(true);
    checkoutMutation.mutate({
      invoiceId,
      provider,
    });
  };

  const handleButtonClick = () => {
    if (!providers || providers.length === 0) {
      setErrorMessage("No active payment providers configured.");
      return;
    }

    if (providers.length === 1 && providers[0]) {
      // If only one provider, trigger payment directly
      handlePay(providers[0]);
    } else {
      // Show choices
      setIsOpen(true);
    }
  };

  const isPending = isRedirecting || checkoutMutation.isPending;

  return (
    <div className="relative inline-block">
      {errorMessage && (
        <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg shadow-lg z-10 text-left">
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleButtonClick}
        disabled={isPending || isLoadingProviders}
        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-1.5 rounded-lg text-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <span className="animate-spin text-xs">⬡</span>
            Redirecting...
          </>
        ) : (
          "Pay Now"
        )}
      </button>

      {/* Choice Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Select Payment Method</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Please choose your preferred gateway to complete the payment.
            </p>

            <div className="space-y-2 pt-2">
              {providers?.map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setIsOpen(false);
                    handlePay(provider);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-accent/10 hover:bg-accent/40 text-sm font-semibold transition-all"
                >
                  <span>
                    {provider === "STRIPE"
                      ? "Credit / Debit Card (Stripe)"
                      : provider === "RAZORPAY"
                        ? "UPI, Cards, Netbanking (Razorpay)"
                        : "PayPal"}
                  </span>
                  <span className="text-primary text-xs">➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
