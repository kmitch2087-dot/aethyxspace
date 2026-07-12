// supabase/functions/_shared/transactional-email-templates/admin-compose.tsx
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AdminComposeProps {
  firstName?: string
  subject?: string
  message?: string
}

const AdminComposeEmail = ({ firstName, subject, message }: AdminComposeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'A message from Aethyx'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>
          {firstName ? `Hi ${firstName},` : 'Hi,'}
        </Heading>
        <Text style={text}>
          {message || ''}
        </Text>

        <Text style={signOff}>— Kristin</Text>

        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminComposeEmail,
  subject: (data: Record<string, any>) => data.subject || 'A message from Aethyx',
  displayName: 'Compose (admin)',
  previewData: { firstName: 'Adam', subject: 'Quick update on your project', message: 'Just wanted to check in — everything is on track for our call next week.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: 0 }
