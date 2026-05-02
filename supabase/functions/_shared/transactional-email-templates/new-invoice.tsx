import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface NewInvoiceProps {
  firstName?: string
  invoiceNumber?: string
  amount?: string
  description?: string
  payUrl?: string
}

const NewInvoiceEmail = ({ firstName, invoiceNumber, amount, description, payUrl }: NewInvoiceProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New invoice ${invoiceNumber || ''} from Aethyx`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Hi ${firstName},` : 'Hello,'}
        </Heading>
        <Text style={text}>
          A new invoice is ready for you. You can review and pay it securely from your
          Aethyx client portal — everything stays branded, no redirects.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Invoice</Text>
          <Text style={cardValue}>{invoiceNumber || '—'}</Text>
          {description ? (
            <>
              <Text style={cardLabel}>For</Text>
              <Text style={cardDesc}>{description}</Text>
            </>
          ) : null}
          <Text style={cardLabel}>Amount due</Text>
          <Text style={cardAmount}>${amount || '0.00'}</Text>
        </Section>

        <Section style={btnWrap}>
          <Button href={payUrl} style={btn}>Review & pay invoice</Button>
        </Section>

        <Text style={small}>
          If the button doesn't work, paste this link into your browser:<br />
          <span style={mono}>{payUrl}</span>
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
  component: NewInvoiceEmail,
  subject: (data: Record<string, any>) => `New invoice ${data.invoiceNumber || ''} from Aethyx`,
  displayName: 'New invoice',
  previewData: { firstName: 'Adam', invoiceNumber: 'AETHYX-0001', amount: '2500.00', description: 'Website Phase 1', payUrl: 'https://aethyx.space/portal/pay/abc' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a14', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 18px' }
const card = { backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '24px', margin: '24px 0' }
const cardLabel = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '12px 0 4px' }
const cardValue = { fontSize: '15px', color: '#0a0a14', margin: '0 0 8px', fontWeight: 500 }
const cardDesc = { fontSize: '14px', color: '#3a3a45', margin: '0 0 8px', lineHeight: '1.5' }
const cardAmount = { fontSize: '28px', color: '#0a0a14', margin: '4px 0 0', fontWeight: 700, letterSpacing: '-0.02em' }
const btnWrap = { margin: '8px 0 28px' }
const btn = { backgroundColor: '#00E6D8', color: '#0a0a14', padding: '14px 28px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const small = { fontSize: '12px', color: '#888', lineHeight: '1.5', margin: '12px 0 0' }
const mono = { fontFamily: 'monospace', wordBreak: 'break-all' as const, color: '#555' }
const signature = { margin: '32px 0 0' }
const signName = { fontSize: '15px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 500 }
const signRole = { fontSize: '13px', color: '#888', margin: 0 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: 0 }
