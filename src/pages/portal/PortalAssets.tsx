import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Image as ImageIcon } from "lucide-react";

interface PortalAsset {
  id: string;
  plan_id: string | null;
  type: "text" | "file";
  category: string;
  label: string;
  content?: string | null;
  file_name?: string | null;
  in_use: boolean;
}

interface PortalPlan {
  id: string;
  project_name: string;
  drive_folder_url?: string | null;
}

const PortalAssets = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PortalPlan[]>([]);
  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [driveDrafts, setDriveDrafts] = useState<Record<string, string>>({});
  const [savingDrive, setSavingDrive] = useState<string | null>(null);

  const load = async () => {
    if (!user || profileLoading) return;
    const profile = resolvedProfile;
    if (!profile) { setLoading(false); return; }

    const { data: plansData } = await supabase
      .from("client_project_plans")
      .select("id, project_name, drive_folder_url")
      .eq("client_profile_id", profile.id)
      .order("created_at");
    setPlans(plansData ?? []);
    setDriveDrafts(
      Object.fromEntries((plansData ?? []).map((p) => [p.id, p.drive_folder_url ?? ""])),
    );

    const { data: assetsData } = await supabase
      .from("client_assets")
      .select("id, plan_id, type, category, label, content, file_name, in_use")
      .eq("client_profile_id", profile.id)
      .order("sort_order");
    setAssets((assetsData ?? []) as PortalAsset[]);

    const fileAssets = (assetsData ?? []).filter((a) => a.type === "file" && a.file_name);
    if (fileAssets.length) {
      const { data: urlData } = await supabase.storage
        .from("client-assets")
        .createSignedUrls(fileAssets.map((a) => a.file_name!), 60 * 60 * 24 * 7);
      if (urlData) {
        const map: Record<string, string> = {};
        for (const item of urlData) {
          const asset = fileAssets.find((a) => a.file_name === item.path);
          if (asset && item.signedUrl) map[asset.id] = item.signedUrl;
        }
        setSignedUrls(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, resolvedProfile, profileLoading]);

  const toggleInUse = async (asset: PortalAsset) => {
    if (isViewingAsAdmin) return;
    const next = !asset.in_use;
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, in_use: next } : a)));
    const { error } = await supabase.from("client_assets").update({ in_use: next }).eq("id", asset.id);
    if (error) {
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, in_use: asset.in_use } : a)));
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  const saveDriveLink = async (planId: string) => {
    if (isViewingAsAdmin) return;
    setSavingDrive(planId);
    const url = driveDrafts[planId]?.trim() || null;
    const { error } = await supabase.from("client_project_plans").update({ drive_folder_url: url }).eq("id", planId);
    setSavingDrive(null);
    if (error) {
      toast({ title: "Failed to save link", description: error.message, variant: "destructive" });
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, drive_folder_url: url } : p)));
    toast({ title: "Drive folder link saved" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const groups: { key: string; title: string; planId: string | null }[] =
    plans.length > 0
      ? plans.map((p) => ({ key: p.id, title: p.project_name, planId: p.id }))
      : [{ key: "none", title: "Project Assets", planId: null }];
  // Assets with no plan_id (single-project clients, or anything not yet assigned)
  // render in their own leading section when the client has more than one plan,
  // so nothing silently disappears once a client becomes multi-plan.
  if (plans.length > 0 && assets.some((a) => a.plan_id === null)) {
    groups.unshift({ key: "unassigned", title: "Project Assets", planId: null });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Your Assets</h1>

      {assets.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">No assets have been added to your project yet.</p>
        </div>
      ) : (
        groups.map((group) => {
          const groupAssets = assets.filter((a) => a.plan_id === group.planId);
          if (groupAssets.length === 0 && group.key !== "unassigned") return null;
          const plan = plans.find((p) => p.id === group.planId);
          return (
            <div key={group.key} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>

              {plan && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <label className="text-sm text-white/60 shrink-0">Google Drive folder link</label>
                  <Input
                    value={driveDrafts[plan.id] ?? ""}
                    onChange={(e) => setDriveDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    size="sm"
                    disabled={isViewingAsAdmin || savingDrive === plan.id}
                    onClick={() => saveDriveLink(plan.id)}
                  >
                    {savingDrive === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              )}

              {groupAssets.length === 0 ? (
                <p className="text-sm text-white/40">No assets in this project yet.</p>
              ) : (
                <div className="space-y-2">
                  {groupAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                      {asset.type === "file" ? (
                        signedUrls[asset.id] ? (
                          <img src={signedUrls[asset.id]} alt={asset.label} className="h-10 w-10 object-contain rounded bg-black/20 shrink-0" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-white/40 shrink-0" />
                        )
                      ) : (
                        <FileText className="h-5 w-5 text-white/40 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{asset.label}</p>
                        {asset.type === "text" && asset.content && (
                          <p className="text-xs text-white/50 truncate">{asset.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-white/50">{asset.in_use ? "In use" : "Not in use"}</span>
                        <Switch
                          checked={asset.in_use}
                          disabled={isViewingAsAdmin}
                          onCheckedChange={() => toggleInUse(asset)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default PortalAssets;
