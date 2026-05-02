import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface InquiryProps {
  name?: string
  email?: string
  phone?: string
  service?: string
  budget?: string
  message?: string
  submittedAt?: string
  source?: string
}

const InquiryNotificationEmail = ({
  name, email, phone, service, budget, message, submittedAt, source,
}: InquiryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New inquiry from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Inquiry</Heading>
        <Text style={subtitle}>A new lead just came in through the site.</Text>

        <Section style={card}>
          {name && <Row label="Name" value={name} />}
          {email && <Row label="Email" value={email} />}
          {phone && <Row label="Phone" value={phone} />}
          {service && <Row label="Service" value={service} />}
          {budget && <Row label="Budget" value={budget} />}
          {source && <Row label="Source" value={source} />}
          {submittedAt && <Row label="Submitted" value={submittedAt} />}
        </Section>

        {message && (
          <>
            <Hr style={divider} />
            <Text style={label}>Message</Text>
            <Text style={messageText}>{message}</Text>
          </>
        )}

        <Hr style={divider} />
        <Text style={footer}>Aethyx · Admin notification</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{label}: </span>
    <span style={rowValue}>{value}</span>
  </Text>
)

export const template = {
  component: InquiryNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New inquiry${data?.name ? ` — ${data.name}` : ''}`,
  displayName: 'Inquiry notification (admin)',
  previewData: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0123',
    service: 'Website redesign',
    budget: '$5k–$10k',
    message: 'I need a new site for my wellness studio.',
    submittedAt: 'May 2, 2026 3:14 PM',
    source: 'Contact page',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 8px' }
const subtitle = { fontSize: '14px', color: '#666', margin: '0 0 24px' }
const card = { backgroundColor: '#f7f7f9', borderRadius: '8px', padding: '20px 22px', margin: '0 0 8px' }
const rowText = { fontSize: '14px', color: '#0a0a14', margin: '0 0 8px', lineHeight: '1.5' }
const rowLabel = { color: '#888', fontWeight: 500 }
const rowValue = { color: '#0a0a14', fontWeight: 500 }
const divider = { borderColor: '#eee', margin: '24px 0' }
const label = { fontSize: '12px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 8px' }
const messageText = { fontSize: '14px', color: '#0a0a14', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: 0 }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
