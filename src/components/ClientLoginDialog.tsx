import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ClientLoginDialogProps {
  open: boolean;
  onClose: () => void;
}

const ClientLoginDialog = ({ open, onClose }: ClientLoginDialogProps) => {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }

    // Check if this user is an admin and route accordingly
    let isAdmin = false;
    if (data.user) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }

    setLoading(false);
    toast({ title: "Welcome back!" });
    onClose();
    navigate(isAdmin ? "/admin" : "/portal");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Full name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // Insert client profile if user was created
    if (data.user) {
      await supabase.from("client_profiles").insert({
        user_id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        business_name: businessName.trim() || null,
        billing_address: billingAddress.trim() || null,
        billing_city: billingCity.trim() || null,
        billing_state: billingState.trim() || null,
        billing_zip: billingZip.trim() || null,
      });
    }

    setLoading(false);
    toast({
      title: "Account created!",
      description: "Please check your email to verify your account before logging in.",
    });
    setTab("login");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Client Portal</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3 mt-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password *</Label>
                <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground font-medium pt-2">Billing Address</p>
              <div>
                <Label>Street Address</Label>
                <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>City</Label>
                  <Input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={billingState} onChange={(e) => setBillingState(e.target.value)} maxLength={2} />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input value={billingZip} onChange={(e) => setBillingZip(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientLoginDialog;
