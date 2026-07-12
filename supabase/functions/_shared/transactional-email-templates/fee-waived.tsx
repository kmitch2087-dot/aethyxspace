import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface FeeWaivedProps {
  firstName?: string
  originalAmount?: string
  discountLabel?: string
}

const FeeWaivedEmail = ({
  firstName,
  originalAmount = '50.00',
  discountLabel = 'Friends & family',
}: FeeWaivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your discovery call fee has been waived — Aethyx</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>
          {firstName ? `Hey, ${firstName}!` : 'Hey there!'}
        </Heading>
        <Text style={text}>
          Your fee for our discovery call has been waived. I can't wait to see what we build together!
        </Text>

        <Section style={invoiceBox}>
          <Text style={invoiceLabel}>RECEIPT</Text>

          <Section style={lineItem}>
            <Row>
              <Column><Text style={itemName}>Discovery Call</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={itemStrike}>${originalAmount}</Text>
              </Column>
            </Row>
            <Row>
              <Column><Text style={discountName}>{discountLabel} discount</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={discountAmount}>−${originalAmount}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={dividerThin} />

          <Row>
            <Column><Text style={totalLabel}>Total due</Text></Column>
            <Column style={{ textAlign: 'right' as const }}>
              <Text style={totalAmount}>$0.00</Text>
            </Column>
          </Row>
        </Section>

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
  component: FeeWaivedEmail,
  subject: 'Your discovery call fee has been waived — Aethyx',
  displayName: 'Fee waived',
  previewData: { firstName: 'Alex', originalAmount: '50.00', discountLabel: 'Friends & family' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const invoiceBox = { backgroundColor: '#f9f9fb', borderRadius: '10px', padding: '24px 28px', margin: '0 0 28px' }
const invoiceLabel = { fontSize: '10px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const lineItem = { margin: '0 0 4px' }
const itemName = { fontSize: '14px', color: '#0a0a14', margin: '0', fontWeight: 500 }
const itemStrike = { fontSize: '14px', color: '#aaa', margin: '0', textDecoration: 'line-through' }
const discountName = { fontSize: '13px', color: '#00B8AC', margin: '4px 0 0' }
const discountAmount = { fontSize: '13px', color: '#00B8AC', margin: '4px 0 0' }
const dividerThin = { borderColor: '#eee', margin: '16px 0' }
const totalLabel = { fontSize: '14px', color: '#0a0a14', margin: '0', fontWeight: 600 }
const totalAmount = { fontSize: '22px', color: '#0a0a14', margin: '0', fontWeight: 700 }
const signature = { margin: '32px 0 0' }
const signName = { fontSize: '15px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 500 }
const signRole = { fontSize: '13px', color: '#888', margin: 0 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
