import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const { signIn, user, isAdmin, loading, adminChecked } = useAuth();
  const navigate = useNavigate();

  // Redirect once auth has resolved and user is admin
  useEffect(() => {
    if (!loading && adminChecked && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, adminChecked, user, isAdmin, navigate]);

  // Show message ONLY after admin check has truly completed
  useEffect(() => {
    if (!loading && adminChecked && user && !isAdmin && !submitting) {
      toast({
        title: "Access denied",
        description: "Your account does not have admin privileges.",
        variant: "destructive",
      });
    }
  }, [loading, adminChecked, user, isAdmin, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        setSubmitting(false);
      }
      // On success, don't reset submitting — let the redirect useEffect handle it
    } catch {
      toast({ title: "Login failed", description: "An unexpected error occurred.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  // Reset submitting state once auth fully resolves after login
  useEffect(() => {
    if (!loading && adminChecked && submitting && !isAdmin) {
      setSubmitting(false);
    }
  }, [loading, adminChecked, isAdmin, submitting]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset email sent", description: "Check your inbox for a password reset link." });
      setForgotMode(false);
      setForgotEmail("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <Card className="w-full max-w-md border-border/30">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl tracking-wider">
            Aethyx<span className="text-primary">.space</span>
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Admin Dashboard</p>
        </CardHeader>
        <CardContent>
          {forgotMode ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={forgotSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgotSubmitting}>
                {forgotSubmitting ? "Sending…" : "Send Reset Email"}
              </Button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || loading}>
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => { setForgotMode(true); setForgotEmail(email); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
