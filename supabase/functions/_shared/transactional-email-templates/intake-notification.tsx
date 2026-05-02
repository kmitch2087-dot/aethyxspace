import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface IntakeProps {
  fullName?: string
  email?: string
  phone?: string
  businessName?: string
  projectType?: string
  timeline?: string
  budget?: string
  goals?: string
  submittedAt?: string
}

const IntakeNotificationEmail = ({
  fullName, email, phone, businessName, projectType, timeline, budget, goals, submittedAt,
}: IntakeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New intake form from {fullName || 'a client'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Intake Submission</Heading>
        <Text style={subtitle}>A client has completed the intake form.</Text>

        <Section style={card}>
          {fullName && <Row label="Name" value={fullName} />}
          {email && <Row label="Email" value={email} />}
          {phone && <Row label="Phone" value={phone} />}
          {businessName && <Row label="Business" value={businessName} />}
          {projectType && <Row label="Project Type" value={projectType} />}
          {timeline && <Row label="Timeline" value={timeline} />}
          {budget && <Row label="Budget" value={budget} />}
          {submittedAt && <Row label="Submitted" value={submittedAt} />}
        </Section>

        {goals && (
          <>
            <Hr style={divider} />
            <Text style={label}>Goals / Notes</Text>
            <Text style={messageText}>{goals}</Text>
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
  component: IntakeNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New intake${data?.fullName ? ` — ${data.fullName}` : ''}`,
  displayName: 'Intake notification (admin)',
  previewData: {
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0123',
    businessName: 'Smith Wellness',
    projectType: 'New website',
    timeline: '2-3 months',
    budget: '$10k–$20k',
    goals: 'Modern presence with online booking and a blog.',
    submittedAt: 'May 2, 2026 3:14 PM',
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
