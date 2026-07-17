import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Seo from "@/components/Seo";

// Reached via the link in Supabase's password-recovery email (used both by the
// portal-invite flow, so a client can set their real password after being invited,
// and by "Forgot password?" in ClientLoginDialog).
//
// Arrival states handled:
// - Valid recovery link → SDK establishes a session → show the set-password form.
// - Expired/already-used link, but the visitor is already signed in (they set
//   their password previously and clicked the old invite again) → straight to
//   their dashboard, no dead end.
// - Expired/used link, not signed in → explain + let them request a fresh link.
// - Cold visit with no token and no session → same request-a-link form.
const ResetPassword = () => {
  const [mode, setMode] = useState<"checking" | "set" | "request">("checking");
  const [linkProblem, setLinkProblem] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const goToDashboard = async () => {
    const { data: userData } = await supabase.auth.getUser();
    let isAdmin = false;
    if (userData.user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }
    navigate(isAdmin ? "/admin" : "/portal", { replace: true });
  };

  useEffect(() => {
    // Supabase leaves error params in the URL when a recovery token is expired
    // or already consumed (it only strips the hash on success).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const hasLinkError = !!(hash.get("error") || hash.get("error_code") || query.get("error") || query.get("error_code"));

    // If the SDK establishes a recovery session after we mount, switch to the form.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (hasLinkError) {
          // Old/used invite link, but they're already set up and signed in.
          goToDashboard();
        } else {
          setMode("set");
        }
      } else {
        setLinkProblem(hasLinkError);
        setMode("request");
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast({ title: "Couldn't set password", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitting(false);
    toast({ title: "Password set", description: "You're all set — signing you in." });
    goToDashboard();
  };

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    // Always reports success — never reveals whether an email has an account.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    setRequestSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <Seo title="Set Your Password | Aethyx" description="Set a new password for your Aethyx account." noindex />
      <Card className="w-full max-w-md border-border/30">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl tracking-wider">
            Aethyx<span className="text-primary">.space</span>
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "set" ? "Set your password" : "Get your sign-in link"}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "checking" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mode === "set" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving…" : "Set password"}
              </Button>
              <button
                type="button"
                onClick={goToDashboard}
                className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Skip — take me to my dashboard
              </button>
            </form>
          ) : requestSent ? (
            <div className="text-center py-4 space-y-2">
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for {email.trim()}, a fresh link is on its way. It's valid for
                a limited time, so use it soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {linkProblem
                  ? "That link has expired or was already used — no problem. Enter your email and we'll send you a fresh one."
                  : "Enter your account email and we'll send you a link to set (or reset) your password."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !email.trim()}>
                {submitting ? "Sending…" : "Email me a fresh link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
