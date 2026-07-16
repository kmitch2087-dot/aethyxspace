// Public: independently-measured traffic stats for the /advertise page.
// Unlike get_traffic_stats() (our own first-party page_views), these numbers
// come from Cloudflare's network edge via the GraphQL Analytics API — measured
// by the CDN itself, so they can't be inflated by anything in our code.
//
// Requires a CF_ANALYTICS_TOKEN secret (Cloudflare API token with Zone:Read +
// Analytics:Read on the aethyx.space zone). Until it's set, returns
// { available: false } and the page simply doesn't render the section.
// Responses are cached ~10 minutes in app_private_config to stay far away
// from Cloudflare's API rate limits regardless of page traffic.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const ZONE_NAME = "aethyx.space";
const CACHE_KEY = "cloudflare_stats_cache";
const CACHE_TTL_MS = 10 * 60 * 1000;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const token = Deno.env.get("CF_ANALYTICS_TOKEN");
    if (!token) return json({ available: false, reason: "not_configured" }, 200, cors);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cached } = await admin
      .from("app_private_config").select("value").eq("key", CACHE_KEY).maybeSingle();
    if (cached?.value) {
      try {
        const parsed = JSON.parse(cached.value);
        if (Date.now() - parsed.fetched_at < CACHE_TTL_MS) return json(parsed.data, 200, cors);
      } catch { /* stale/corrupt cache — refetch */ }
    }

    const cfHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Resolve the zone id by name so only the token needs configuring.
    const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}`, { headers: cfHeaders });
    const zoneJson = await zoneRes.json();
    const zoneTag = zoneJson?.result?.[0]?.id;
    if (!zoneTag) {
      console.error("[cloudflare-stats] zone lookup failed:", JSON.stringify(zoneJson?.errors || zoneJson).slice(0, 300));
      return json({ available: false, reason: "zone_lookup_failed" }, 200, cors);
    }

    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const gqlRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: cfHeaders,
      body: JSON.stringify({
        query: `query($zoneTag: String!, $since: Date!, $until: Date!) {
          viewer { zones(filter: {zoneTag: $zoneTag}) {
            httpRequests1dGroups(limit: 40, filter: {date_geq: $since, date_leq: $until}) {
              sum { requests pageViews }
              uniq { uniques }
              dimensions { date }
            }
          } }
        }`,
        variables: { zoneTag, since, until },
      }),
    });
    const gql = await gqlRes.json();
    const groups = gql?.data?.viewer?.zones?.[0]?.httpRequests1dGroups;
    if (!Array.isArray(groups)) {
      console.error("[cloudflare-stats] graphql failed:", JSON.stringify(gql?.errors || gql).slice(0, 400));
      return json({ available: false, reason: "analytics_query_failed" }, 200, cors);
    }

    // deno-lint-ignore no-explicit-any
    const totals = groups.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: { requests: number; pageViews: number; uniques: number }, g: any) => ({
        requests: acc.requests + (g.sum?.requests || 0),
        pageViews: acc.pageViews + (g.sum?.pageViews || 0),
        // Daily uniques summed — same methodology Cloudflare's own dashboard uses
        // for a multi-day "unique visitors" figure.
        uniques: acc.uniques + (g.uniq?.uniques || 0),
      }),
      { requests: 0, pageViews: 0, uniques: 0 },
    );

    const data = {
      available: true,
      page_views_30d: totals.pageViews,
      unique_visitors_30d: totals.uniques,
      requests_30d: totals.requests,
      since,
      until,
      source: "Cloudflare network analytics",
    };

    await admin.from("app_private_config").upsert({
      key: CACHE_KEY,
      value: JSON.stringify({ fetched_at: Date.now(), data }),
      updated_at: new Date().toISOString(),
    });

    return json(data, 200, cors);
  } catch (err) {
    console.error("[cloudflare-stats]", err);
    return json({ available: false, reason: "error" }, 200, cors);
  }
});
