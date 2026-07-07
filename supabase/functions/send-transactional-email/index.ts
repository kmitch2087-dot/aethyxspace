import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const FROM_PERSONAL = 'Kristin at Aethyx <kristinmitchell@aethyx.space>'
const FROM_BRAND = 'Aethyx Web Design <kristinmitchell@aethyx.space>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let templateName: string
  let recipientEmail: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    if (body.templateData && typeof body.templateData === 'object') templateData = body.templateData
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!templateName) return new Response(JSON.stringify({ error: 'templateName is required' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  const template = TEMPLATES[templateName]
  if (!template) {
    return new Response(JSON.stringify({ error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}` }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const to = template.to || recipientEmail
  if (!to) return new Response(JSON.stringify({ error: 'recipientEmail is required' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  // Check suppression list
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', to.toLowerCase())
    .maybeSingle()

  if (suppressed) {
    return new Response(JSON.stringify({ success: false, reason: 'email_suppressed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // For marketing emails, generate/retrieve an unsubscribe token and inject the URL
  if (template.senderType === 'brand') {
    const token = crypto.randomUUID()
    const { data: existing } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', to.toLowerCase())
      .maybeSingle()

    if (existing) {
      templateData = { ...templateData, unsubscribeUrl: `https://aethyx.space/unsubscribe?token=${existing.token}` }
    } else {
      await supabase.from('email_unsubscribe_tokens').insert({ token, email: to.toLowerCase() })
      templateData = { ...templateData, unsubscribeUrl: `https://aethyx.space/unsubscribe?token=${token}` }
    }
  }

  const html = await renderAsync(React.createElement(template.component, templateData))
  const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: template.senderType === 'brand' ? FROM_BRAND : FROM_PERSONAL, to: [to], subject, html, text }),
  })

  const resBody = await res.json()

  // Log to email_send_log
  await supabase.from('email_send_log').insert({
    message_id: resBody.id || crypto.randomUUID(),
    template_name: templateName,
    recipient_email: to,
    status: res.ok ? 'sent' : 'failed',
    error_message: res.ok ? null : JSON.stringify(resBody),
  })

  if (!res.ok) {
    console.error('[send-transactional-email] Resend error:', resBody)
    return new Response(JSON.stringify({ error: 'Failed to send email', detail: resBody }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, id: resBody.id }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
