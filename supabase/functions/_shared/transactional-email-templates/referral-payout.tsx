import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReferralPayoutProps {
  firstName?: string
  amount?: string
  payoutMethod?: string
  referredName?: string
  isCredit?: boolean
}

const ReferralPayoutEmail = ({
  firstName = 'there',
  amount = '100.00',
  payoutMethod = 'PayPal',
  referredName = 'your referral',
  isCredit = false,
}: ReferralPayoutProps) => {
  const deliveryText = isCredit
    ? 'applied as a credit to your account'
    : `sent via ${payoutMethod}`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your referral payout of ${amount} has been sent — Aethyx</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
          <Heading style={h1}>Your payout is here, {firstName}!</Heading>
          <Text style={text}>
            Your ${amount} reward for referring {referredName} has been {deliveryText}.
          </Text>

          <Section style={receiptBox}>
            <Text style={receiptLabel}>PAYOUT RECEIPT</Text>
            <Hr style={dividerThin} />
            <Row>
              <Column><Text style={rowLabel}>Amount</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>${amount}</Text>
              </Column>
            </Row>
            <Row>
              <Column><Text style={rowLabel}>Method</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>{isCredit ? 'Account credit' : payoutMethod}</Text>
              </Column>
            </Row>
            <Row>
              <Column><Text style={rowLabel}>For referring</Text></Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={rowValue}>{referredName}</Text>
              </Column>
            </Row>
          </Section>

          <Text style={closing}>
            Keep sharing your referral link to earn more.
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
  component: ReferralPayoutEmail,
  subject: (data: Record<string, any>) =>
    `Your referral payout of $${data.amount ?? '100.00'} has been sent — Aethyx`,
  senderType: 'personal',
  displayName: 'Referral payout',
  previewData: {
    firstName: 'Alex',
    amount: '100.00',
    payoutMethod: 'PayPal',
    referredName: 'Jordan Lee',
    isCredit: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const receiptBox = { backgroundColor: '#f9f9fb', borderRadius: '10px', padding: '24px 28px', margin: '0 0 28px' }
const receiptLabel = { fontSize: '10px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const dividerThin = { borderColor: '#eee', margin: '0 0 16px' }
const rowLabel = { fontSize: '14px', color: '#888', margin: '0 0 10px', fontWeight: 400 }
const rowValue = { fontSize: '14px', color: '#0a0a14', margin: '0 0 10px', fontWeight: 500 }
const closing = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 4px' }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
