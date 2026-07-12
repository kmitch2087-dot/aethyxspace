import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const allowedOrigins = [
  "https://aethyx.space",
  "https://www.aethyx.space",
  "http://localhost:8080",
  "http://localhost:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

const CONSULTATION_PRICE_ID = "price_1SwQ4mCEyzqaryb8RIoTHGwM";

const MEETING_TYPE_LABEL: Record<string, string> = {
  phone: "Phone call",
  google_meet: "Google Meet",
};

const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

/** Format a Date as YYYYMMDDTHHMMSSZ for Google Calendar template URLs. */
const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Exchange the stored OAuth refresh token for a Google access token. */
async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("[schedule-consultation] google token exchange failed:", await res.text());
    return null;
  }
  return (await res.json()).access_token as string;
}

interface CalendarResult {
  eventId: string | null;
  meetLink: string | null;
}

/**
 * Create (or, on reschedule, update) the consultation event on Kristin's Google
 * Calendar, inviting the client. For Google Meet consultations with no manually
 * pasted link, Google auto-generates a Meet link which we return for the email.
 * Failures are non-fatal — scheduling proceeds without the calendar event.
 */
async function upsertCalendarEvent(opts: {
  existingEventId: string | null;
  clientName: string;
  clientEmail: string;
  start: Date;
  end: Date;
  meetingType: string;
  manualLink: string;
}): Promise<CalendarResult> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return { eventId: null, meetLink: null };

  const wantsMeet = opts.meetingType === "google_meet";
  const body: Record<string, unknown> = {
    summary: `Aethyx Consultation — ${opts.clientName}`,
    description: opts.meetingType === "phone"
      ? "Phone consultation — Kristin will call the number from the intake."
      : (opts.manualLink ? `Google Meet: ${opts.manualLink}` : "Google Meet consultation."),
    start: { dateTime: opts.start.toISOString(), timeZone: "America/New_York" },
    end: { dateTime: opts.end.toISOString(), timeZone: "America/New_York" },
    attendees: [{ email: opts.clientEmail }],
  };
  if (wantsMeet && !opts.manualLink && !opts.existingEventId) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const url = opts.existingEventId
    ? `${base}/${encodeURIComponent(opts.existingEventId)}?conferenceDataVersion=1&sendUpdates=all`
    : `${base}?conferenceDataVersion=1&sendUpdates=all`;

  const res = await fetch(url, {
    method: opts.existingEventId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("[schedule-consultation] calendar upsert failed:", res.status, await res.text());
    return { eventId: null, meetLink: null };
  }
  const event = await res.json();
  const meetLink = event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((e: { entryPointType?: string; uri?: string }) =>
      e.entryPointType === "video"
    )?.uri || null;
  return { eventId: event.id ?? null, meetLink };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return json({ error: "Unauthorized origin" }, 403, corsHeaders);
  }

  try {
    // Validate caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Auth required" }, 401, corsHeaders);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid auth" }, 401, corsHeaders);

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, corsHeaders);

    const { intakeId, scheduledAt, meetingType, meetingLink, isReschedule } = await req.json();

    if (!intakeId || typeof intakeId !== "string") {
      return json({ error: "intakeId required" }, 400, corsHeaders);
    }
    const start = new Date(scheduledAt);
    if (!scheduledAt || isNaN(start.getTime())) {
      return json({ error: "Valid scheduledAt required" }, 400, corsHeaders);
    }
    if (start.getTime() < Date.now()) {
      return json({ error: "Meeting time must be in the future" }, 400, corsHeaders);
    }
    if (!MEETING_TYPE_LABEL[meetingType]) {
      return json({ error: "meetingType must be phone or google_meet" }, 400, corsHeaders);
    }
    const cleanLink = typeof meetingLink === "string" ? meetingLink.trim().slice(0, 500) : "";
    if (cleanLink && !/^https:\/\//.test(cleanLink)) {
      return json({ error: "Meeting link must be an https URL" }, 400, corsHeaders);
    }

    const { data: intake, error: intakeErr } = await supabaseAdmin
      .from("client_intakes")
      .select(
        "id, email, full_name, status, meeting_reschedule_used, consultation_invoice_id, consultation_invoice_url, consultation_paid_at, google_event_id",
      )
      .eq("id", intakeId)
      .maybeSingle();
    if (intakeErr || !intake) return json({ error: "Intake not found" }, 404, corsHeaders);

    if (isReschedule && intake.meeting_reschedule_used) {
      return json({ error: "The one included reschedule has already been used" }, 409, corsHeaders);
    }

    // Invoice: create once, on first schedule, unless the fee was already paid or waived.
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let invoiceId = intake.consultation_invoice_id as string | null;
    let payUrl = intake.consultation_invoice_url as string | null;
    const feeSettled = !!intake.consultation_paid_at || intake.status === "paid" || intake.status === "waived";

    if (!feeSettled && !invoiceId) {
      const cleanEmail = String(intake.email).trim().toLowerCase().slice(0, 320);
      const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });
      const customerId = customers.data.length > 0
        ? customers.data[0].id
        : (await stripe.customers.create({ email: cleanEmail, name: intake.full_name || undefined })).id;

      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: 7,
        description: "Aethyx Strategy Consultation",
        metadata: { type: "consultation_invoice", intake_id: intakeId },
      });
      await stripe.invoiceItems.create({
        customer: customerId,
        pricing: { price: CONSULTATION_PRICE_ID },
        invoice: invoice.id,
      });
      // Finalize only — the branded consultation-scheduled email below carries the
      // hosted payment link, so Stripe's own invoice email is intentionally not sent.
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      invoiceId = finalized.id;
      payUrl = finalized.hosted_invoice_url || null;
    }

    // Put the meeting on Kristin's Google Calendar (creates the Meet link when
    // none was pasted manually). Non-fatal if the integration isn't configured.
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const calendar = await upsertCalendarEvent({
      existingEventId: (intake.google_event_id as string | null) || null,
      clientName: intake.full_name || "Client",
      clientEmail: intake.email,
      start,
      end,
      meetingType,
      manualLink: cleanLink,
    });
    const effectiveLink = cleanLink || (meetingType === "google_meet" ? calendar.meetLink || "" : "");

    const updates: Record<string, unknown> = {
      meeting_scheduled_at: start.toISOString(),
      meeting_type: meetingType,
      meeting_link: effectiveLink || null,
      consultation_invoice_id: invoiceId,
      consultation_invoice_url: payUrl,
    };
    if (calendar.eventId) updates.google_event_id = calendar.eventId;
    if (isReschedule) updates.meeting_reschedule_used = true;
    if (!feeSettled && (intake.status === "new" || intake.status === "reviewing")) {
      updates.status = "invoice_sent";
    }

    const { error: updateErr } = await supabaseAdmin
      .from("client_intakes")
      .update(updates)
      .eq("id", intakeId);
    if (updateErr) {
      console.error("[schedule-consultation] update failed:", updateErr);
      return json({ error: "Failed to save meeting details" }, 500, corsHeaders);
    }

    // Client-facing formatting (Eastern Time) + add-to-calendar link
    const meetingDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric",
    }).format(start);
    const meetingTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "numeric", minute: "2-digit",
    }).format(start);

    const calDetails = meetingType === "google_meet"
      ? (effectiveLink ? `Join: ${effectiveLink}` : "Google Meet link to follow.")
      : "Kristin will call you at the number you provided.";
    const calendarUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent("Aethyx Strategy Consultation")}` +
      `&dates=${gcalStamp(start)}/${gcalStamp(end)}` +
      `&details=${encodeURIComponent(calDetails)}`;

    const firstName = (intake.full_name || "").split(" ")[0] || "";
    const { error: emailErr } = await supabaseAdmin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "consultation-scheduled",
        recipientEmail: intake.email,
        idempotencyKey: `consultation-scheduled-${intakeId}-${start.toISOString()}`,
        templateData: {
          firstName,
          meetingDate,
          meetingTime,
          meetingTypeLabel: MEETING_TYPE_LABEL[meetingType],
          meetingLink: meetingType === "google_meet" ? effectiveLink : "",
          payUrl: feeSettled ? "" : payUrl || "",
          calendarUrl,
          isReschedule: !!isReschedule,
        },
      },
    });
    if (emailErr) {
      console.error("[schedule-consultation] email failed:", emailErr);
      return json(
        { success: true, emailSent: false, warning: "Meeting saved but the email failed to send" },
        200,
        corsHeaders,
      );
    }

    return json(
      { success: true, emailSent: true, payUrl, calendarAdded: !!calendar.eventId, meetLink: effectiveLink || null },
      200,
      corsHeaders,
    );
  } catch (error: unknown) {
    console.error("[schedule-consultation]", error);
    // Admin-only caller, so surfacing the underlying message is safe and aids debugging
    const detail = error instanceof Error ? error.message : String(error);
    return json({ error: `Failed to schedule the consultation: ${detail}` }, 500, corsHeaders);
  }
});
