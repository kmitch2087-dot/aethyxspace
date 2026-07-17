import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface PortalInviteProps {
  firstName?: string
  actionLink?: string
  portalUrl?: string
  /** Optional custom paragraphs replacing the default intro copy (e.g. a
   * personal note on a manual resend). Newlines split into paragraphs. */
  intro?: string
}

const PortalInviteEmail = ({ firstName, actionLink, portalUrl, intro }: PortalInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aethyx client portal is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Section style={expiryNote}>
          <Text style={expiryText}>
            ⏳ <strong>Heads-up:</strong> for security, this sign-in link expires 24 hours after
            it's sent. If it's expired when you click it, the page will let you send yourself a
            fresh one in two taps.
          </Text>
        </Section>
        <Heading style={h1}>
          {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
        </Heading>
        {intro ? (
          intro.split(/\n\n+/).map((p, i) => (
            <Text key={i} style={text}>{p}</Text>
          ))
        ) : (
          <>
            <Text style={text}>
              Your private Aethyx client portal has been created. From here you'll be able to
              view invoices, documents, agreements, and stay in sync with your project as we
              build it together.
            </Text>
            <Text style={text}>
              To get in, set your password using the secure link below.
            </Text>
          </>
        )}
        <Section style={btnWrap}>
          <Button href={actionLink} style={btn}>Set your password</Button>
        </Section>
        <Text style={small}>
          Or paste this into your browser: <br />
          <span style={mono}>{actionLink}</span>
        </Text>
        <Section style={signature}>
          <Text style={signName}>— Kristin</Text>
          <Text style={signRole}>Founder, Aethyx</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PortalInviteEmail,
  subject: 'Your Aethyx client portal is ready',
  displayName: 'Portal invite',
  previewData: { firstName: 'Adam', actionLink: 'https://aethyx.space/portal', portalUrl: 'https://aethyx.space/portal' },
} satisfies TemplateEntry

const expiryNote = { backgroundColor: '#fffbeb', border: '1px solid #f5d47a', borderRadius: '8px', padding: '10px 16px', margin: '0 0 24px' }
const expiryText = { fontSize: '13px', color: '#7a5c00', lineHeight: '1.6', margin: 0 }
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 18px' }
const btnWrap = { margin: '28px 0' }
const btn = { backgroundColor: '#00E6D8', color: '#0a0a14', padding: '14px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', letterSpacing: '0.02em' }
const small = { fontSize: '12px', color: '#888', lineHeight: '1.5', margin: '12px 0 0' }
const mono = { fontFamily: 'monospace', wordBreak: 'break-all' as const, color: '#555' }
const signature = { margin: '32px 0 0' }
const signName = { fontSize: '15px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 500 }
const signRole = { fontSize: '13px', color: '#888', margin: 0 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
