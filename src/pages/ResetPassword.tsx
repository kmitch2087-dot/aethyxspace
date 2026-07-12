import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Seo from "@/components/Seo";

// Reached via the link in Supabase's password-recovery email (used both by the
// portal-invite flow, so a client can set their real password after being invited,
// and by "Forgot password?" in ClientLoginDialog). By the time this page mounts,
// Supabase's client SDK has already parsed the recovery token from the URL and
// established a session — updateUser() just needs that session to already exist.
const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

    // Route admins to /admin, everyone else to /portal — mirrors the routing logic
    // already used right after a normal login (ClientLoginDialog's handleLogin).
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
    setSubmitting(false);
    toast({ title: "Password set", description: "You're all set — signing you in." });
    navigate(isAdmin ? "/admin" : "/portal", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
      <Seo title="Set Your Password | Aethyx" description="Set a new password for your Aethyx account." noindex />
      <Card className="w-full max-w-md border-border/30">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl tracking-wider">
            Aethyx<span className="text-primary">.space</span>
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Set your password</p>
        </CardHeader>
        <CardContent>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
