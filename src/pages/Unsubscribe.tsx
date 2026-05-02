import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data.valid) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        {state === "validating" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verifying your link…</p>
          </>
        )}
        {state === "ready" && (
          <>
            <h1 className="text-2xl font-semibold mb-3">Unsubscribe</h1>
            <p className="text-muted-foreground mb-6">
              Click below to stop receiving emails from Aethyx.
            </p>
            <Button onClick={handleConfirm} size="lg">Confirm unsubscribe</Button>
          </>
        )}
        {state === "submitting" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Processing…</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-semibold mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground">You won't receive further emails from us.</p>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-semibold mb-2">Already unsubscribed</h1>
            <p className="text-muted-foreground">This email is already removed from our list.</p>
          </>
        )}
        {(state === "invalid" || state === "error") && (
          <>
            <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-semibold mb-2">Link unavailable</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or expired. Please contact us if you continue to receive emails.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
