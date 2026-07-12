import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface PortalActivationProps {
  clientName?: string
  clientEmail?: string
  businessName?: string
  activatedAt?: string
  adminClientUrl?: string
}

const PortalActivationEmail = ({
  clientName, clientEmail, businessName, activatedAt, adminClientUrl,
}: PortalActivationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{clientName || 'A client'} just signed into the Aethyx portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>Portal activated</Heading>
        <Text style={text}>
          {clientName || 'A new client'} just signed into their Aethyx client portal
          for the first time{businessName ? ` (${businessName})` : ''}.
        </Text>
        <Section style={meta}>
          {clientEmail && <Text style={metaLine}><strong>Email:</strong> {clientEmail}</Text>}
          {activatedAt && <Text style={metaLine}><strong>Activated:</strong> {activatedAt}</Text>}
        </Section>
        {adminClientUrl && (
          <Text style={text}>
            <Link href={adminClientUrl} style={link}>Open client profile →</Link>
          </Text>
        )}
        <Hr style={divider} />
        <Text style={footer}>aethyx.space · Admin notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PortalActivationEmail,
  subject: (data) => `Portal activated: ${data?.clientName || data?.clientEmail || 'new client'}`,
  displayName: 'Portal activation notification',
  previewData: {
    clientName: 'Irving Munoz',
    clientEmail: 'scottysadventures401@gmail.com',
    businessName: "Scotty's Adventures",
    activatedAt: 'May 11, 2026 11:55 AM',
    adminClientUrl: 'https://aethyx.space/admin/clients/abc',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 18px' }
const meta = { backgroundColor: '#f6f6f8', padding: '16px 20px', borderRadius: '6px', margin: '0 0 24px' }
const metaLine = { fontSize: '14px', color: '#3a3a45', margin: '0 0 4px', lineHeight: '1.5' }
const link = { color: '#00B8AC', textDecoration: 'none', fontWeight: 500 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
