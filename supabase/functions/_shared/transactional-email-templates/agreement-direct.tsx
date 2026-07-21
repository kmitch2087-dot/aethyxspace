import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AgreementDirectProps {
  firstName?: string
  loginEmail?: string
  signUrl?: string
  payUrl?: string
  invoiceNumber?: string
  invoiceAmount?: string
  invoiceDueDate?: string
  invoiceDescription?: string
  /** Google account the client grants access to (Ads / GBP / GA4). */
  accessEmail?: string
  agreementTitle?: string
  scopeText?: string
  includesText?: string
  investmentText?: string
  adSpendText?: string
  timelineText?: string
  terms?: string[]
  /** Why the ID upload step is back (shown under step 2). */
  idResetNote?: string
}

const AgreementDirectEmail = ({
  firstName,
  loginEmail,
  signUrl = 'https://aethyx.space/portal/agreements',
  payUrl,
  invoiceNumber,
  invoiceAmount,
  invoiceDueDate,
  invoiceDescription,
  accessEmail,
  agreementTitle,
  scopeText,
  includesText,
  investmentText,
  adSpendText,
  timelineText,
  terms = [],
  idResetNote,
}: AgreementDirectProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your agreement, first invoice, and every link you need — all in one email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />

        <Heading style={h1}>{firstName ? `Hi ${firstName} — let's get this moving.` : 'Hi — let’s get this moving.'}</Heading>

        <Text style={text}>
          I know the portal's been a little clunky to click through, so I've pulled{' '}
          <strong>everything you need into this one email</strong>. There are three quick things
          left on your side — about ten minutes total — and then I can start building your campaign.
        </Text>

        <Text style={sectionLabel}>Your 3 steps</Text>

        {/* STEP 1 */}
        <Section style={step}>
          <Text style={stepTitle}>1&nbsp;&nbsp;Sign your agreement</Text>
          <Text style={stepText}>
            The button below takes you <em>straight to the signing page</em> — no digging through
            the dashboard. Scroll to the bottom, draw your signature in the box, and hit the teal{' '}
            <strong>Submit Agreement</strong> button. (Your name, company, and address are already
            filled in from last time.)
          </Text>
          <Button href={signUrl} style={btn}>Review &amp; sign agreement</Button>
          <Text style={hint}>~3 minutes{loginEmail ? ` · sign in with ${loginEmail}` : ''}</Text>
        </Section>

        {/* STEP 2 */}
        <Section style={step}>
          <Text style={stepTitle}>2&nbsp;&nbsp;Upload a photo of your driver's license</Text>
          <Text style={stepText}>
            {idResetNote || 'The file that came through earlier wasn’t your ID, so I’ve reset that step — you’ll see the Upload Photo ID button again on the same signing page. A clear phone photo of your driver’s license is perfect.'}
          </Text>
          <Text style={hint}>~1 minute · same page as step 1</Text>
        </Section>

        {/* STEP 3 */}
        <Section style={step}>
          <Text style={stepTitle}>3&nbsp;&nbsp;Pay your first invoice{invoiceAmount ? ` — ${invoiceAmount}` : ''}</Text>
          <Text style={stepText}>
            This covers campaign setup plus your first month of management. The payment link works
            right from this email — no portal login needed.
          </Text>
          {payUrl && <Button href={payUrl} style={btn}>Pay {invoiceAmount || 'invoice'}</Button>}
          <Text style={hint}>~2 minutes · card or bank, secure checkout by Stripe</Text>
        </Section>

        {/* AGREEMENT SUMMARY */}
        <Text style={sectionLabel}>Your agreement at a glance</Text>
        <Section style={card}>
          {agreementTitle && <Text style={docTitle}>{agreementTitle}</Text>}
          <Text style={docSub}>Aethyx Web Design Studio · full agreement attached as PDF &amp; signable online</Text>
          {scopeText && (<><Text style={rowLabel}>Scope</Text><Text style={rowText}>{scopeText}</Text></>)}
          {includesText && (<><Text style={rowLabel}>Includes</Text><Text style={rowText}>{includesText}</Text></>)}
          {investmentText && (<><Text style={rowLabel}>Investment</Text><Text style={rowText}>{investmentText}</Text></>)}
          {adSpendText && (<><Text style={rowLabel}>Ad spend</Text><Text style={rowText}>{adSpendText}</Text></>)}
          {timelineText && (<><Text style={rowLabel}>Timeline</Text><Text style={rowText}>{timelineText}</Text></>)}
          {terms.length > 0 && (
            <>
              <Text style={rowLabel}>Key terms</Text>
              {terms.map((t, i) => (<Text key={i} style={termText}>• {t}</Text>))}
            </>
          )}
        </Section>
        <Text style={small}>
          The complete terms are in the attached PDF — the same document you'll be signing online in step 1.
        </Text>

        {/* INVOICE */}
        {payUrl && (
          <>
            <Text style={sectionLabel}>Your first invoice</Text>
            <Section style={invoiceCard}>
              <Text style={amountText}>{invoiceAmount}</Text>
              <Text style={invMeta}>
                {[invoiceNumber && `Invoice ${invoiceNumber}`, invoiceDescription, invoiceDueDate && `due ${invoiceDueDate}`]
                  .filter(Boolean).join(' · ')}
              </Text>
              <Section style={{ textAlign: 'center' as const, margin: '14px 0 4px' }}>
                <Button href={payUrl} style={btn}>Pay now</Button>
              </Section>
            </Section>
          </>
        )}

        {/* ACCESS CHECKLIST */}
        <Text style={sectionLabel}>Access checklist — what I need from you to build the campaign</Text>
        <Text style={small}>
          You can knock these out any time — before or right after signing. Each one takes about
          two minutes, and I've listed exactly where to click.
        </Text>
        {accessEmail && (
          <Section style={accessBox}>
            <Text style={accessBoxLabel}>Add me with this exact email, everywhere below:</Text>
            <Text style={accessBoxEmail}>{accessEmail}</Text>
            <Text style={accessBoxNote}>
              (That's my Google account for managing your ads — different from the address this
              email came from, so double-check you're typing this one.)
            </Text>
          </Section>
        )}

        <Section style={step}>
          <Text style={stepTitle}>✓&nbsp;&nbsp;Google Ads account — add me as admin</Text>
          <Text style={stepText}>
            Go to <Link href="https://ads.google.com" style={link}>ads.google.com</Link> → sign in →
            click <strong>Admin</strong> (gear icon, bottom left) → <strong>Access and security</strong> →
            the blue <strong>+</strong> → enter <strong>{accessEmail}</strong> → choose{' '}
            <strong>Admin</strong> → Send invitation.
          </Text>
          <Text style={hint}>
            Even easier: reply with the 10-digit Customer ID shown in the top-right corner of
            Google Ads, and I'll send the request from my side — you just click Accept.
          </Text>
        </Section>

        <Section style={step}>
          <Text style={stepTitle}>✓&nbsp;&nbsp;Google Business Profile — add me as manager</Text>
          <Text style={stepText}>
            Go to <Link href="https://business.google.com" style={link}>business.google.com</Link> →
            select your business → click the three-dot menu → <strong>Business Profile settings</strong> →
            <strong> People and access</strong> → <strong>Add</strong> → enter{' '}
            <strong>{accessEmail}</strong> → role: <strong>Manager</strong>.
          </Text>
          <Text style={hint}>This lets me keep your profile sharp so the ads convert better.</Text>
        </Section>

        <Section style={step}>
          <Text style={stepTitle}>✓&nbsp;&nbsp;Google Analytics — only if you already have it</Text>
          <Text style={stepText}>
            If you've ever set up Google Analytics for your site, go to{' '}
            <Link href="https://analytics.google.com" style={link}>analytics.google.com</Link> →
            <strong> Admin</strong> (gear, bottom left) → <strong>Account access management</strong> →
            <strong> +</strong> → add <strong>{accessEmail}</strong> as <strong>Administrator</strong>.
          </Text>
          <Text style={hint}>Never set it up? Skip this — I'll build it for you, it's included.</Text>
        </Section>

        <Section style={step}>
          <Text style={stepTitle}>✓&nbsp;&nbsp;Booksy — add me as a staff member</Text>
          <Text style={stepText}>
            Log in at <Link href="https://booksy.com/biz" style={link}>booksy.com/biz</Link> (or open
            the Booksy Biz app) → <strong>Staff members</strong> → <strong>Add staff member</strong> →
            enter <strong>{accessEmail}</strong>. That lets me see which ads actually turn into
            booked appointments.
          </Text>
          <Text style={hint}>
            Use anything else alongside Booksy — an Instagram booking link, Square, a website form?
            Just reply and tell me what, and I'll handle the rest.
          </Text>
        </Section>

        <Section style={helpNote}>
          <Text style={helpText}>
            <strong>Stuck on any of these?</strong> Reply to this email or text me and we'll hop on
            a quick call — I can walk you through every screen in a few minutes.
          </Text>
        </Section>

        <Text style={text}>
          That's it — sign, license photo, first payment, and start ticking off the access list.
          The moment the paperwork and access are in, I'm building your campaign. Questions on
          anything? Just reply.
        </Text>

        <Section style={signature}>
          <Text style={signName}>— Kristin</Text>
          <Text style={signRole}>Founder, Aethyx</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Aethyx Web Design Studio · aethyx.space · kristinmitchell@aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AgreementDirectEmail,
  subject: 'Everything you need in one place — agreement, first invoice & your links',
  displayName: 'Agreement direct (sign + pay + access)',
  previewData: {
    firstName: 'Irving',
    loginEmail: 'irvthebarber401@gmail.com',
    signUrl: 'https://aethyx.space/portal/agreements',
    payUrl: 'https://invoice.stripe.com/i/EXAMPLE',
    invoiceNumber: '#AETX-1042',
    invoiceAmount: '$500.00',
    invoiceDueDate: 'July 28, 2026',
    invoiceDescription: 'First payment — setup + month 1',
    accessEmail: 'kmitch2087@gmail.com',
    agreementTitle: 'Google Ads Management — Limitless Barbershop',
    scopeText: 'Local Google Ads setup & management for Limitless Barbershop (Cumberland, RI) — 90-day engagement built around Google Search Ads with local radius targeting, plus a courtesy website SEO review.',
    includesText: 'Campaign setup (keywords, ad copy, radius targeting, budget & launch) · GA4 + tracking setup · weekly check-ins · monthly performance summaries · 90-day review with next-step recommendation.',
    investmentText: '$1,200 total — $500 now (setup + month 1) · $350 before month 2 · $350 before month 3. Friend rate — standard would run roughly $700 setup + $300–500/mo.',
    adSpendText: '$150/week (~$21/day) goes directly to Google through your own Google Ads account — separate from the fees above.',
    timelineText: 'July 10 – October 8, 2026',
    terms: [
      'No guarantee of specific results — performance depends on budget, competition, seasonality, reviews, and booking flow.',
      'Referral perk: $100 when someone you refer signs, $100 more when their project launches; 3 signed referrals upgrades you to 10% of every sale.',
      'You’re responsible for the accuracy of business info and offers used in the ads.',
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 18px' }
const small = { fontSize: '13px', color: '#6b6c78', lineHeight: '1.6', margin: '0 0 14px' }
const sectionLabel = { fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#6b6c78', margin: '36px 0 14px' }
const step = { borderBottom: '1px solid #ececf0', padding: '4px 0 16px', margin: '0 0 12px' }
const stepTitle = { fontSize: '15px', fontWeight: 600, color: '#0a0a14', margin: '0 0 6px' }
const stepText = { fontSize: '14px', color: '#3a3a45', lineHeight: '1.6', margin: '0 0 10px' }
const hint = { fontSize: '12px', color: '#8a8b96', lineHeight: '1.6', margin: '10px 0 0' }
const btn = { background: '#00E6D8', color: '#0a0a14', padding: '12px 28px', borderRadius: '999px', fontWeight: 600, fontSize: '14px', textDecoration: 'none', letterSpacing: '0.03em' }
const link = { color: '#0d7d74' }
const card = { border: '1px solid #dcdde3', borderRadius: '10px', padding: '22px 24px', margin: '0 0 10px' }
const docTitle = { fontSize: '17px', fontWeight: 600, color: '#0a0a14', margin: '0 0 2px' }
const docSub = { fontSize: '13px', color: '#8a8b96', margin: '0 0 16px' }
const rowLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8a8b96', margin: '14px 0 3px' }
const rowText = { fontSize: '14px', color: '#3a3a45', lineHeight: '1.6', margin: 0 }
const termText = { fontSize: '13px', color: '#6b6c78', lineHeight: '1.6', margin: '0 0 5px' }
const invoiceCard = { border: '1px solid #dcdde3', borderRadius: '10px', padding: '22px 24px', margin: '0 0 10px', textAlign: 'center' as const }
const amountText = { fontSize: '30px', fontWeight: 600, color: '#0a0a14', margin: '0 0 4px' }
const invMeta = { fontSize: '13px', color: '#8a8b96', margin: 0 }
const accessBox = { backgroundColor: '#f0fdfb', border: '2px solid #00E6D8', borderRadius: '10px', padding: '14px 18px', margin: '0 0 18px', textAlign: 'center' as const }
const accessBoxLabel = { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#0d7d74', margin: '0 0 4px' }
const accessBoxEmail = { fontSize: '19px', fontWeight: 700, color: '#0a0a14', margin: '0 0 6px', fontFamily: 'Menlo, Consolas, monospace' }
const accessBoxNote = { fontSize: '12px', color: '#6b6c78', lineHeight: '1.5', margin: 0 }
const helpNote = { backgroundColor: '#fffbeb', border: '1px solid #f5d47a', borderRadius: '8px', padding: '10px 16px', margin: '8px 0 24px' }
const helpText = { fontSize: '13px', color: '#7a5c00', lineHeight: '1.6', margin: 0 }
const signature = { margin: '18px 0 0' }
const signName = { fontSize: '15px', fontWeight: 600, color: '#0a0a14', margin: 0 }
const signRole = { fontSize: '13px', color: '#8a8b96', margin: '2px 0 0' }
const divider = { borderColor: '#ececf0', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#b0b1ba', margin: 0 }
