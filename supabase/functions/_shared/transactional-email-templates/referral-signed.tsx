import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReferralSignedProps {
  referrerFirstName?: string
  referredName?: string
  firstRewardAmount?: string
  completionBonusAmount?: string
}

const ReferralSignedEmail = ({
  referrerFirstName = 'there',
  referredName = 'your referral',
  firstRewardAmount = '200.00',
  completionBonusAmount = '150.00',
}: ReferralSignedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your referral signed — ${firstRewardAmount} is on its way!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Great news, {referrerFirstName}!</Heading>
        <Text style={text}>
          {referredName} just signed on with Aethyx — and that means your ${firstRewardAmount} reward is on its way.
          You'll also earn an additional ${completionBonusAmount} once their project goes live.
        </Text>

        <Section style={rewardBox}>
          <Text style={rewardLabel}>YOUR REWARD</Text>
          <Text style={rewardAmount}>${firstRewardAmount}</Text>
          <Text style={rewardNote}>+${completionBonusAmount} bonus when their project launches</Text>
        </Section>

        <Text style={closing}>
          Thanks for spreading the word — it means the world.
        </Text>
        <Text style={signOff}>— Kristin</Text>

        <Hr style={divider} />
        <Text style={footer}>aethyx.space</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReferralSignedEmail,
  subject: (data: Record<string, any>) =>
    `Your referral signed — $${data.firstRewardAmount ?? '200.00'} is on its way!`,
  senderType: 'personal',
  displayName: 'Referral signed',
  previewData: {
    referrerFirstName: 'Alex',
    referredName: 'Jordan Lee',
    firstRewardAmount: '200.00',
    completionBonusAmount: '150.00',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const rewardBox = { backgroundColor: '#f0fffe', border: '1px solid #00B8AC', borderRadius: '10px', padding: '24px 28px', margin: '0 0 28px', textAlign: 'center' as const }
const rewardLabel = { fontSize: '10px', color: '#00B8AC', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 8px', fontWeight: 600 }
const rewardAmount = { fontSize: '36px', fontWeight: 700, color: '#00B8AC', margin: '0 0 8px', letterSpacing: '-0.02em' }
const rewardNote = { fontSize: '13px', color: '#3a3a45', margin: '0' }
const closing = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 4px' }
const signOff = { fontSize: '15px', color: '#0a0a14', fontWeight: 500, margin: '0 0 32px' }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
