import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { computeAddOnRequestState } from "@/lib/addOnRequestState";
import { useToast } from "@/hooks/use-toast";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  display_price: string | null;
  sort_order: number;
}

interface ClientAddOnRow {
  id: string;
  add_on_catalog_id: string | null;
  status: string;
}

const PortalAddOns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [clientAddOns, setClientAddOns] = useState<ClientAddOnRow[]>([]);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: profileData } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const pid = profileData?.id ?? null;
    setProfileId(pid);

    const [catalogResult, addOnsResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("add_on_catalog")
        .select("id, name, description, type, category, display_price, sort_order")
        .eq("active", true)
        .order("sort_order"),
      pid
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any)
            .from("client_add_ons")
            .select("id, add_on_catalog_id, status")
            .eq("client_profile_id", pid)
        : Promise.resolve({ data: [] }),
    ]);

    setCatalog((catalogResult.data as CatalogItem[]) || []);
    setClientAddOns((addOnsResult.data as ClientAddOnRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const requestAddOn = async (catalogId: string) => {
    if (!profileId) return;
    setRequestingId(catalogId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_add_ons").insert({
      client_profile_id: profileId,
      add_on_catalog_id: catalogId,
      status: "requested",
      price: null,
    });
    setRequestingId(null);
    if (!error) {
      setClientAddOns((prev) => [...prev, { id: crypto.randomUUID(), add_on_catalog_id: catalogId, status: "requested" }]);
    } else {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const retainers = catalog.filter((c) => c.category === "retainer");
  const projectAddOns = catalog.filter((c) => c.category === "project");

  const renderItem = (item: CatalogItem) => {
    const state = computeAddOnRequestState(clientAddOns, item.id);
    return (
      <Card key={item.id} className="border-border/30">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              {item.display_price && (
                <p className="text-primary font-display text-lg mt-0.5">{item.display_price}</p>
              )}
            </div>
            {state === "active" && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Active</Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          {state === "requestable" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={requestingId === item.id}
              onClick={() => requestAddOn(item.id)}
            >
              {requestingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
              Request this
            </Button>
          )}
          {state === "requested" && (
            <Button size="sm" variant="outline" className="mt-2" disabled>
              Requested — Kristin will follow up
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display tracking-wider mb-1 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> Add-On Services
        </h1>
        <p className="text-muted-foreground text-sm">
          Extend your project with ongoing support or one-time upgrades. Request anything below
          and I'll follow up to confirm scope and pricing.
        </p>
      </div>

      {retainers.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Recurring Retainers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {retainers.map(renderItem)}
          </div>
        </div>
      )}

      {projectAddOns.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            One-Time Project Add-Ons
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projectAddOns.map(renderItem)}
          </div>
        </div>
      )}

      {catalog.length === 0 && (
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No add-on services available right now.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalAddOns;
