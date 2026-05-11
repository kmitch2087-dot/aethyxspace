import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Aethyx'

interface Props {
  recipientName?: string
  portalUrl: string
}

const IntakeRequiredEmail = ({ recipientName, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>One quick step before we start — your Aethyx intake</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{recipientName ? `Welcome, ${recipientName}.` : 'Welcome.'}</Heading>
        <Text style={text}>
          Your client portal is ready. Before we begin, please complete the short intake form inside your portal — it tells me about your brand, goals, and audience so when we meet, I come prepared with real research.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={portalUrl} style={button}>Complete your intake</Button>
        </Section>
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: IntakeRequiredEmail,
  subject: 'Quick step before we start — your Aethyx intake',
  displayName: 'Intake required',
  previewData: { recipientName: 'Jane', portalUrl: 'https://aethyx.space/portal/intake' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#0a0a14', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a44', lineHeight: '1.6', margin: '0 0 16px' }
const button = { background: '#00E6D8', color: '#0a0a14', padding: '12px 32px', borderRadius: '999px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', letterSpacing: '0.05em' }
const footer = { fontSize: '12px', color: '#999', margin: '36px 0 0', textAlign: 'center' as const }
