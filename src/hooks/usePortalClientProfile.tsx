// src/hooks/usePortalClientProfile.tsx
// Resolves "which client's data should this portal page show." Normally that's the
// logged-in client's own profile. If an admin opens a portal page with ?viewAs=<id>,
// this resolves to the target client's profile instead — the one seam every portal
// page and PortalLayout consume, so View-as-Client doesn't require a parallel data
// path or a credential/session swap.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface PortalClientProfile {
  id: string;
  full_name: string;
  email: string | null;
  [key: string]: unknown;
}

interface UsePortalClientProfileResult {
  profile: PortalClientProfile | null;
  loading: boolean;
  isViewingAsAdmin: boolean;
}

export function usePortalClientProfile(): UsePortalClientProfileResult {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const viewAs = searchParams.get("viewAs");
  const [profile, setProfile] = useState<PortalClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isViewingAsAdmin = Boolean(viewAs && isAdmin);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      if (isViewingAsAdmin && viewAs) {
        const { data } = await supabase.from("client_profiles").select("*").eq("id", viewAs).maybeSingle();
        setProfile(data as PortalClientProfile | null);
      } else {
        const { data } = await supabase.from("client_profiles").select("*").eq("user_id", user.id).maybeSingle();
        setProfile(data as PortalClientProfile | null);
      }
      setLoading(false);
    })();
  }, [user, viewAs, isViewingAsAdmin]);

  return { profile, loading, isViewingAsAdmin };
}
