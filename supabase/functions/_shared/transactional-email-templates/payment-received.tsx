import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface PaymentReceivedProps {
  firstName?: string
  invoiceNumber?: string
  amount?: string
}

const PaymentReceivedEmail = ({ firstName, invoiceNumber, amount }: PaymentReceivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — thank you</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Thank you, ${firstName}.` : 'Thank you.'}
        </Heading>
        <Text style={text}>
          Your payment has been received. Below is a quick reference for your records — you can
          also find this invoice anytime in your client portal.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Invoice</Text>
          <Text style={cardValue}>{invoiceNumber || '—'}</Text>
          <Text style={cardLabel}>Amount paid</Text>
          <Text style={cardAmount}>${amount || '0.00'}</Text>
        </Section>
        <Text style={text}>I appreciate the trust — looking forward to the next step.</Text>
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
  component: PaymentReceivedEmail,
  subject: 'Payment received — Aethyx',
  displayName: 'Payment received',
  previewData: { firstName: 'Adam', invoiceNumber: 'AETHYX-0001', amount: '2500.00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 18px' }
const card = { backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '24px', margin: '24px 0' }
const cardLabel = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '12px 0 4px' }
const cardValue = { fontSize: '15px', color: '#0a0a14', margin: '0 0 8px', fontWeight: 500 }
const cardAmount = { fontSize: '28px', color: '#0a0a14', margin: '4px 0 0', fontWeight: 700 }
const signature = { margin: '32px 0 0' }
const signName = { fontSize: '15px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 500 }
const signRole = { fontSize: '13px', color: '#888', margin: 0 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: 0 }
