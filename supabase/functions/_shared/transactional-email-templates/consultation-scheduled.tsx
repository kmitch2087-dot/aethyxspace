import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ConsultationScheduledProps {
  firstName?: string
  meetingDate?: string
  meetingTime?: string
  meetingTypeLabel?: string
  meetingLink?: string
  payUrl?: string
  calendarUrl?: string
  isReschedule?: boolean | string
}

const ConsultationScheduledEmail = ({
  firstName,
  meetingDate,
  meetingTime,
  meetingTypeLabel = 'Phone call',
  meetingLink,
  payUrl,
  calendarUrl,
  isReschedule,
}: ConsultationScheduledProps) => {
  const rescheduled = isReschedule === true || isReschedule === 'true'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {rescheduled
          ? 'Your Aethyx consultation has been rescheduled'
          : 'Your Aethyx strategy consultation is scheduled'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://aethyx.space/aethyx-logo.png" width="120" alt="Aethyx" style={logo} />
          <Heading style={h1}>
            {firstName ? `Hey, ${firstName}!` : 'Hey there!'}
          </Heading>
          <Text style={text}>
            {rescheduled
              ? 'Your strategy consultation has been rescheduled. Here are your updated meeting details:'
              : "I've reviewed your submission and scheduled your strategy consultation. Here are the details:"}
          </Text>

          <Section style={detailBox}>
            <Text style={detailLabel}>YOUR CONSULTATION</Text>
            <Text style={detailBig}>{meetingDate}</Text>
            <Text style={detailTime}>{meetingTime} (Eastern Time)</Text>
            <Text style={detailType}>{meetingTypeLabel}</Text>
            {meetingLink ? (
              <Button href={meetingLink} style={joinButton}>Join Google Meet</Button>
            ) : null}
            {calendarUrl ? (
              <Text style={calText}>
                <Link href={calendarUrl} style={calLink}>Add to your calendar →</Link>
              </Text>
            ) : null}
          </Section>

          {payUrl ? (
            <>
              <Text style={text}>
                To confirm your spot, please complete the $50 consultation fee before our meeting:
              </Text>
              <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
                <Button href={payUrl} style={payButton}>Pay $50 Consultation Fee</Button>
              </Section>
            </>
          ) : null}

          <Section style={policyBox}>
            <Text style={policyTitle}>Consultation policy</Text>
            <Text style={policyText}>
              The consultation fee is non-refundable, but it's credited toward your project total
              if we work together. Need a different time? One reschedule is included — just let me
              know at least 4 hours before your scheduled meeting.
            </Text>
          </Section>

          <Text style={text}>
            I'll come prepared with real research on your brand, market, and competitors — see you soon.
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
}

export const template = {
  component: ConsultationScheduledEmail,
  subject: (data: Record<string, any>) =>
    data.isReschedule === true || data.isReschedule === 'true'
      ? 'Your consultation has been rescheduled — Aethyx'
      : 'Your strategy consultation is scheduled — Aethyx',
  displayName: 'Consultation scheduled',
  previewData: {
    firstName: 'Alex',
    meetingDate: 'Tuesday, July 15',
    meetingTime: '2:00 PM',
    meetingTypeLabel: 'Google Meet',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    payUrl: 'https://invoice.stripe.com/example',
    calendarUrl: 'https://calendar.google.com/calendar/render',
    isReschedule: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 32px', maxWidth: '560px' }
const logo = { marginBottom: '20px' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#0a0a14', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#3a3a45', lineHeight: '1.7', margin: '0 0 28px' }
const detailBox = { backgroundColor: '#f9f9fb', borderRadius: '10px', padding: '24px 28px', margin: '0 0 28px', textAlign: 'center' as const }
const detailLabel = { fontSize: '10px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 12px' }
const detailBig = { fontSize: '22px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 700 }
const detailTime = { fontSize: '16px', color: '#0a0a14', margin: '0 0 8px', fontWeight: 500 }
const detailType = { fontSize: '13px', color: '#00B8AC', margin: '0 0 16px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }
const joinButton = { backgroundColor: '#0a0a14', borderRadius: '999px', color: '#ffffff', fontSize: '14px', fontWeight: 600, padding: '12px 28px', textDecoration: 'none' }
const calText = { fontSize: '13px', margin: '16px 0 0' }
const calLink = { color: '#00B8AC', textDecoration: 'underline' }
const payButton = { backgroundColor: '#00B8AC', borderRadius: '999px', color: '#04211f', fontSize: '15px', fontWeight: 700, padding: '14px 32px', textDecoration: 'none' }
const policyBox = { borderLeft: '3px solid #e5e5ea', padding: '4px 0 4px 16px', margin: '0 0 28px' }
const policyTitle = { fontSize: '12px', color: '#0a0a14', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 6px' }
const policyText = { fontSize: '13px', color: '#6a6a75', lineHeight: '1.6', margin: 0 }
const signature = { margin: '32px 0 0' }
const signName = { fontSize: '15px', color: '#0a0a14', margin: '0 0 4px', fontWeight: 500 }
const signRole = { fontSize: '13px', color: '#888', margin: 0 }
const divider = { borderColor: '#eee', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
