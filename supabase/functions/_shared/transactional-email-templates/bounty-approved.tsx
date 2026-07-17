import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BountyApprovedProps {
  firstName?: string
  referralUrl?: string
}

const BountyApprovedEmail = ({
  firstName = 'there',
  referralUrl = 'https://aethyx.space/intake',
}: BountyApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're approved for the Aethyx Bounty Program!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
        <Heading style={h1}>You're in, {firstName}!</Heading>
        <Text style={text}>
          Your Aethyx Bounty Program application has been approved. Share the link below with
          anyone who could use a new website or ads management — here's how you get paid:
        </Text>

        <Section style={rewardsBox}>
          <Text style={rewardLine}>💵 <strong>$100</strong> when your referral signs</Text>
          <Text style={rewardLine}>🚀 <strong>$100</strong> when their project launches</Text>
          <Text style={rewardLineLast}>⭐ After <strong>3 signed referrals</strong>, you're upgraded to <strong>10% commission on every sale</strong></Text>
        </Section>

        <Section style={linkBox}>
          <Text style={linkLabel}>YOUR BOUNTY LINK</Text>
          <Text style={linkValue}>{referralUrl}</Text>
        </Section>

        <Text style={closing}>
          Thanks for partnering with us — looking forward to your first referral.
        </Text>
        <Text style={signOff}>— Kristin</Text>

        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BountyApprovedEmail,
  subject: `You're approved for the Aethyx Bounty Program!`,
  senderType: 'personal',
  displayName: 'Bounty approved',
  previewData: {
    firstName: 'Alex',
    referralUrl: 'https://aethyx.space/intake?ref=abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const rewardsBox = { backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '18px 24px', margin: '0 0 20px' }
const rewardLine = { fontSize: '14px', color: '#3a3a45', lineHeight: '1.6', margin: '0 0 8px' }
const rewardLineLast = { fontSize: '14px', color: '#3a3a45', lineHeight: '1.6', margin: '0' }
const linkBox = { backgroundColor: '#f0fffe', border: '1px solid #00B8AC', borderRadius: '10px', padding: '20px 24px', margin: '0 0 28px', textAlign: 'center' as const }
const linkLabel = { fontSize: '10px', color: '#00B8AC', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 8px', fontWeight: 600 }
const linkValue = { fontSize: '15px', fontWeight: 600, color: '#0a0a14', margin: '0', wordBreak: 'break-all' as const }
const closing = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 4px' }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
