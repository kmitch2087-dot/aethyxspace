// supabase/functions/_shared/transactional-email-templates/offer-lead-notification.tsx
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface OfferLeadProps {
  name?: string
  email?: string
  phone?: string
  businessName?: string
  websiteUrl?: string
  need?: string
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Text style={row}><strong>{label}:</strong> {value || '—'}</Text>
)

const OfferLeadEmail = ({ name, email, phone, businessName, websiteUrl, need }: OfferLeadProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New launch-offer lead: {name || 'someone'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>New /launch lead 🚀</Heading>
        <Section style={box}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Phone" value={phone} />
          <Row label="Business" value={businessName} />
          <Row label="Website" value={websiteUrl} />
          <Row label="What they need" value={need} />
        </Section>
        <Hr style={divider} />
        <Text style={footer}>aethyx.space/launch</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OfferLeadEmail,
  subject: (data: Record<string, unknown>) => `New launch lead — ${data.name || 'unknown'}${data.businessName ? ` (${data.businessName})` : ''}`,
  to: 'kmitch2087@gmail.com',
  displayName: 'Offer lead notification (internal)',
  previewData: { name: 'Sam Rivera', email: 'sam@example.com', phone: '401-555-0100', businessName: 'Rivera Fitness', websiteUrl: 'https://riverafit.com', need: 'New site + Google profile' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px' }
const box = { backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '16px 20px' }
const row = { fontSize: '14px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 6px' }
const divider = { borderColor: '#eee', margin: '28px 0 14px' }
const footer = { fontSize: '12px', color: '#999', margin: 0 }
