import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link2, Loader2, Users } from "lucide-react";
import { format } from "date-fns";

interface ReferralProgramSettings {
  id: string;
  enabled: boolean;
  first_reward_amount: number;
  completion_bonus_amount: number;
  tier_threshold: number;
  commission_rate: number;
  new_client_discount: number;
  eligibility_notes: string | null;
}

interface ReferralLink {
  id: string;
  client_profile_id: string;
  code: string;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_profile_id: string;
  referred_email: string;
  referred_name: string | null;
  status: string;
  first_reward_paid_at: string | null;
  completion_bonus_paid_at: string | null;
  payout_method: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted/60 text-muted-foreground border-border/40" },
  signed: { label: "Signed", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  live: { label: "Live", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  payout_sent: { label: "Paid Out", className: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive-foreground/50 border-destructive/20" },
};

const PortalReferrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReferralProgramSettings | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profileData } = await supabase
        .from("client_profiles")
        .select("id, referral_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      const pid = profileData?.id ?? null;
      const enabled = profileData?.referral_enabled ?? false;

      if (!enabled) {
        setLoading(false);
        return; // hasAccess stays false; loading state below renders the disabled message
      }

      const [linkResult, settingsResult, referralsResult] = await Promise.all([
        pid
          ? supabase.from("referral_links").select("*").eq("client_profile_id", pid).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("referral_program_settings").select("*").maybeSingle(),
        pid
          ? supabase
              .from("referrals")
              .select("*")
              .eq("referrer_profile_id", pid)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      let code = (linkResult.data as ReferralLink | null)?.code ?? null;
      if (!code && pid) {
        const newCode = Math.random().toString(36).slice(2, 10);
        const { data: inserted } = await supabase
          .from("referral_links")
          .insert({ client_profile_id: pid, code: newCode })
          .select("code")
          .single();
        code = inserted?.code ?? null;
      }

      setReferralCode(code);
      setSettings((settingsResult.data as ReferralProgramSettings | null));
      setReferrals((referralsResult.data as Referral[]) || []);
      setHasAccess(true);
      setLoading(false);
    })();
  }, [user]);

  const referralUrl = referralCode ? `https://aethyx.space/intake?ref=${referralCode}` : null;

  const copyToClipboard = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const firstRewardAmount = settings?.first_reward_amount ?? 200;
  const completionBonusAmount = settings?.completion_bonus_amount ?? 150;
  const tierThreshold = settings?.tier_threshold ?? 3;
  const commissionRate = settings?.commission_rate ?? 0.1;
  const newClientDiscount = settings?.new_client_discount ?? 100;

  const totalEarned = referrals.reduce((sum, r) => {
    if (r.first_reward_paid_at) sum += Number(firstRewardAmount);
    if (r.completion_bonus_paid_at) sum += Number(completionBonusAmount);
    return sum;
  }, 0);

  const hasPaidRewards = referrals.some(
    (r) => r.first_reward_paid_at || r.completion_bonus_paid_at
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display tracking-wider mb-1">Referral Program</h1>
        </div>
        <div className="rounded-lg border border-border/30 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          The referral program isn't enabled for your account yet. Reach out if you'd like to
          join and start earning referral rewards.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display tracking-wider mb-1">Referral Program</h1>
        <p className="text-muted-foreground text-sm">
          Refer someone to Aethyx and earn cash rewards when they sign and go live.
        </p>
      </div>

      {settings?.enabled === false && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          The referral program is currently paused. Check back soon.
        </div>
      )}

      <Card className="border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralUrl ? (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 rounded-md bg-muted/40 border border-border/30 px-3 py-2 font-mono text-sm text-foreground/80 truncate select-all">
                  {referralUrl}
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 border-border/30 min-w-[96px]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link. When someone uses it and signs with Aethyx, you earn a reward.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to generate your referral link. Please contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          How It Works
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/30">
            <CardContent className="pt-5">
              <div className="text-2xl mb-2">💰</div>
              <p className="text-xs text-muted-foreground mb-1">When they sign</p>
              <p className="text-xl font-display font-bold text-primary">
                ${Number(firstRewardAmount).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">cash reward</p>
            </CardContent>
          </Card>

          <Card className="border-border/30">
            <CardContent className="pt-5">
              <div className="text-2xl mb-2">🎉</div>
              <p className="text-xs text-muted-foreground mb-1">When their project goes live</p>
              <p className="text-xl font-display font-bold text-primary">
                +${Number(completionBonusAmount).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">completion bonus</p>
            </CardContent>
          </Card>

          <Card className="border-border/30">
            <CardContent className="pt-5">
              <div className="text-2xl mb-2">📈</div>
              <p className="text-xs text-muted-foreground mb-1">
                After {tierThreshold} referrals
              </p>
              <p className="text-xl font-display font-bold text-primary">
                {(Number(commissionRate) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">commission on every project</p>
            </CardContent>
          </Card>

          <Card className="border-border/30">
            <CardContent className="pt-5">
              <div className="text-2xl mb-2">🎁</div>
              <p className="text-xs text-muted-foreground mb-1">They also get</p>
              <p className="text-xl font-display font-bold text-primary">
                ${Number(newClientDiscount).toFixed(0)} off
              </p>
              <p className="text-xs text-muted-foreground">their first invoice</p>
            </CardContent>
          </Card>
        </div>

        {settings?.eligibility_notes && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            {settings.eligibility_notes}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Your Referrals
          </h2>
          {hasPaidRewards && (
            <span className="text-sm font-medium text-emerald-400">
              Total earned: ${totalEarned.toFixed(2)}
            </span>
          )}
        </div>

        {referrals.length === 0 ? (
          <Card className="border-border/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No referrals yet. Share your link to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => {
              const sc = STATUS_CONFIG[ref.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={ref.id} className="border-border/30">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {ref.referred_name || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {ref.referred_email}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {format(new Date(ref.created_at), "MMM d, yyyy")}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${sc.className}`}
                        >
                          {sc.label}
                        </span>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            First reward{" "}
                            {ref.first_reward_paid_at ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            Bonus{" "}
                            {ref.completion_bonus_paid_at ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalReferrals;
