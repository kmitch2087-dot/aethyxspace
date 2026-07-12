import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Aethyx'

interface Props {
  recipientName?: string
  documentTitle?: string
  message?: string
  downloadUrl: string
  expiresIn?: string
}

const DocumentShareEmail = ({ recipientName, documentTitle, message, downloadUrl, expiresIn }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{documentTitle ? `${documentTitle} from ${SITE_NAME}` : `A document from ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>{recipientName ? `Hi ${recipientName},` : 'Hi,'}</Heading>
        <Text style={text}>
          {message?.trim() ||
            `${SITE_NAME} has shared a document with you${documentTitle ? `: ${documentTitle}` : ''}.`}
        </Text>
        {documentTitle && (
          <Section style={card}>
            <Text style={cardTitle}>{documentTitle}</Text>
          </Section>
        )}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={downloadUrl} style={button}>Download document</Button>
        </Section>
        <Text style={small}>
          {expiresIn
            ? `This link expires in ${expiresIn}. If it expires, just reply and I'll resend.`
            : 'This link is time-limited. Reply if it expires.'}
        </Text>
        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DocumentShareEmail,
  subject: (d: any) => d?.documentTitle ? `${d.documentTitle} — from ${SITE_NAME}` : `A document from ${SITE_NAME}`,
  displayName: 'Document share',
  previewData: { recipientName: 'Jane', documentTitle: 'Service Agreement.pdf', message: '', downloadUrl: 'https://example.com/file', expiresIn: '7 days' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '22px', fontWeight: '600', color: '#0a0a14', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a44', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const card = { background: '#f6f6fa', borderRadius: '10px', padding: '14px 18px', margin: '8px 0 0' }
const cardTitle = { fontSize: '14px', color: '#0a0a14', margin: '0', fontWeight: '500' }
const button = { background: '#00E6D8', color: '#0a0a14', padding: '12px 28px', borderRadius: '999px', fontWeight: '600', fontSize: '14px', textDecoration: 'none', letterSpacing: '0.05em' }
const small = { fontSize: '12px', color: '#999', margin: '12px 0 0' }
const footer = { fontSize: '12px', color: '#999', margin: '36px 0 0' }
