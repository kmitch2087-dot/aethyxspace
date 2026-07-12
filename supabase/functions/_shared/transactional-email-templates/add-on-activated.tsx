import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Row, Column, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AddOnActivatedProps {
  firstName?: string
  addOnName?: string
  price?: string
  type?: 'recurring' | 'one_time'
  startDate?: string
  portalUrl?: string
}

const AddOnActivatedEmail = ({
  firstName = 'there',
  addOnName = 'SEO Starter',
  price = '400.00',
  type = 'recurring',
  startDate = 'today',
  portalUrl = 'https://aethyx.space/portal',
}: AddOnActivatedProps) => {
  const serviceLabel = type === 'recurring' ? 'subscription' : 'service'
  const priceDisplay = type === 'recurring' ? `$${price}/mo` : `$${price}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {addOnName} is now active — Aethyx</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
          <Heading style={h1}>You're all set, {firstName}!</Heading>
          <Text style={text}>
            Your {addOnName} {serviceLabel} is now active as of {startDate}.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsLabel}>SERVICE DETAILS</Text>
            <Hr style={dividerThin} />
            <Row>
              <Column><Text style={rowLabel}>Service</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>{addOnName}</Text>
              </Column>
            </Row>
            <Row>
              <Column><Text style={rowLabel}>Price</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>{priceDisplay}</Text>
              </Column>
            </Row>
            <Row>
              <Column><Text style={rowLabel}>Started</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>{startDate}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={ctaSection}>
            <Link href={portalUrl} style={ctaButton}>View in your portal →</Link>
          </Section>

          <Text style={closing}>
            Looking forward to the results.
          </Text>
          <Text style={signOff}>— Kristin</Text>

          <Hr style={divider} />
          <Text style={footer}>aethyx.space</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AddOnActivatedEmail,
  subject: (data: Record<string, any>) =>
    `Your ${data.addOnName ?? 'add-on'} is now active — Aethyx`,
  senderType: 'personal',
  displayName: 'Add-on activated',
  previewData: {
    firstName: 'Alex',
    addOnName: 'SEO Starter',
    price: '400.00',
    type: 'recurring',
    startDate: 'July 7, 2026',
    portalUrl: 'https://aethyx.space/portal',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const detailsBox = { backgroundColor: '#f9f9fb', borderRadius: '10px', padding: '24px 28px', margin: '0 0 28px' }
const detailsLabel = { fontSize: '10px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const dividerThin = { borderColor: '#eee', margin: '0 0 16px' }
const rowLabel = { fontSize: '14px', color: '#888', margin: '0 0 10px', fontWeight: 400 }
const rowValue = { fontSize: '14px', color: '#0a0a14', margin: '0 0 10px', fontWeight: 500 }
const ctaSection = { margin: '0 0 28px' }
const ctaButton = { display: 'inline-block', backgroundColor: '#00B8AC', color: '#ffffff', fontSize: '14px', fontWeight: 600, padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }
const closing = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 4px' }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
