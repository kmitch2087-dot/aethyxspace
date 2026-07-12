import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Aethyx'

interface Props {
  recipientName?: string
  invoiceNumber?: string
  amount: string
  dueDate?: string
  description?: string
  message?: string
  hostedUrl: string
  pdfUrl?: string
}

const InvoiceDeliveryEmail = ({ recipientName, invoiceNumber, amount, dueDate, description, message, hostedUrl, pdfUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber || ''} from {SITE_NAME} — {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hi,'}</Heading>
        <Text style={text}>
          {message?.trim() || `Your invoice from ${SITE_NAME} is ready.`}
        </Text>
        <Section style={card}>
          {invoiceNumber && <Text style={cardLabel}>Invoice {invoiceNumber}</Text>}
          <Text style={amountText}>{amount}</Text>
          {description && <Text style={cardDesc}>{description}</Text>}
          {dueDate && <Text style={cardDesc}>Due {dueDate}</Text>}
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={hostedUrl} style={button}>View &amp; pay invoice</Button>
        </Section>
        {pdfUrl && (
          <Text style={center}>
            <Link href={pdfUrl} style={link}>Download PDF</Link>
          </Text>
        )}
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceDeliveryEmail,
  subject: (d: any) => `Invoice ${d?.invoiceNumber || ''} from ${SITE_NAME}`.trim(),
  displayName: 'Invoice delivery',
  previewData: { recipientName: 'Jane', invoiceNumber: 'INV-001', amount: '$450.00', dueDate: 'Nov 30, 2025', description: 'Brand strategy session', hostedUrl: 'https://stripe.com/i/test', pdfUrl: 'https://stripe.com/i/test.pdf' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#0a0a14', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a44', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const card = { background: '#f6f6fa', borderRadius: '12px', padding: '20px 22px', margin: '8px 0 0', textAlign: 'center' as const }
const cardLabel = { fontSize: '11px', color: '#999', margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }
const amountText = { fontSize: '32px', color: '#0a0a14', margin: '4px 0', fontWeight: '700' }
const cardDesc = { fontSize: '13px', color: '#666', margin: '4px 0' }
const button = { background: '#00E6D8', color: '#0a0a14', padding: '12px 32px', borderRadius: '999px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', letterSpacing: '0.05em' }
const center = { textAlign: 'center' as const, margin: '8px 0' }
const link = { color: '#00E6D8', fontSize: '13px' }
const footer = { fontSize: '12px', color: '#999', margin: '36px 0 0', textAlign: 'center' as const }
