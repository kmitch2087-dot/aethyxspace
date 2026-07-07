import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Link, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ServicesSpotlightProps {
  firstName?: string
  unsubscribeUrl?: string
}

const ServicesSpotlightEmail = ({ firstName, unsubscribeUrl }: ServicesSpotlightProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your brand deserves a digital presence that converts — Aethyx Web Design</Preview>
    <Body style={main}>
      <Container style={container}>

        {/* Header */}
        <Section style={header}>
          <Text style={wordmark}>AETHYX</Text>
          <Text style={tagline}>Web Design &amp; Creative Strategy</Text>
        </Section>

        {/* Hero */}
        <Section style={hero}>
          <Heading style={h1}>
            Your brand deserves a digital presence that actually converts.
          </Heading>
          <Text style={heroSub}>
            {firstName ? `Hey ${firstName} — ` : ''}we build websites and visual identities for businesses that are serious about growth. Not templates. Not cookie-cutter. Custom work, built to perform.
          </Text>
          <Link href="https://aethyx.space/intake" style={ctaButton}>
            Start Your Project →
          </Link>
        </Section>

        <Hr style={divider} />

        {/* Services */}
        <Section style={servicesSection}>
          <Text style={sectionLabel}>WHAT WE DO</Text>

          <Row style={serviceRow}>
            <Column style={serviceIcon}><Text style={iconText}>◈</Text></Column>
            <Column style={serviceBody}>
              <Text style={serviceTitle}>Custom Web Design</Text>
              <Text style={serviceDesc}>
                Strategy-led design that looks stunning and moves visitors toward action. Every layout is built around your business goals.
              </Text>
            </Column>
          </Row>

          <Row style={serviceRow}>
            <Column style={serviceIcon}><Text style={iconText}>◈</Text></Column>
            <Column style={serviceBody}>
              <Text style={serviceTitle}>Brand Identity</Text>
              <Text style={serviceDesc}>
                Logo, color, typography, voice — a cohesive identity that makes your business instantly recognizable and memorable.
              </Text>
            </Column>
          </Row>

          <Row style={serviceRow}>
            <Column style={serviceIcon}><Text style={iconText}>◈</Text></Column>
            <Column style={serviceBody}>
              <Text style={serviceTitle}>Digital Marketing</Text>
              <Text style={serviceDesc}>
                Content strategy, social direction, and SEO foundations that bring the right people to your site and keep them there.
              </Text>
            </Column>
          </Row>
        </Section>

        <Hr style={divider} />

        {/* CTA block */}
        <Section style={ctaSection}>
          <Text style={ctaHeading}>Ready to get started?</Text>
          <Text style={ctaBody}>
            Book a free discovery call and we'll talk through your vision, your goals, and whether we're a good fit. No pressure — just a real conversation.
          </Text>
          <Link href="https://aethyx.space/intake" style={ctaButton}>
            Book a Discovery Call
          </Link>
        </Section>

        <Hr style={divider} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>Aethyx Web Design · aethyx.space</Text>
          <Text style={footerText}>
            You're receiving this because you expressed interest in working with us.{' '}
            {unsubscribeUrl && (
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
            )}
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ServicesSpotlightEmail,
  subject: 'Your brand deserves better — let\'s build something great',
  senderType: 'brand',
  displayName: 'Services spotlight (marketing)',
  previewData: { firstName: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#0a0a14', fontFamily: 'Inter, Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0' }

const header = { padding: '40px 48px 32px', textAlign: 'center' as const }
const wordmark = { fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.18em', margin: '0 0 4px', textTransform: 'uppercase' as const }
const tagline = { fontSize: '11px', color: '#00B8AC', letterSpacing: '0.1em', textTransform: 'uppercase' as const, margin: '0' }

const hero = { padding: '0 48px 36px' }
const h1 = { fontSize: '28px', fontWeight: 700, color: '#ffffff', lineHeight: '1.25', letterSpacing: '-0.02em', margin: '0 0 18px' }
const heroSub = { fontSize: '15px', color: '#a0a0b0', lineHeight: '1.7', margin: '0 0 28px' }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#00B8AC',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '14px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  letterSpacing: '0.01em',
}

const divider = { borderColor: '#1e1e2e', margin: '0' }

const servicesSection = { padding: '36px 48px' }
const sectionLabel = { fontSize: '10px', color: '#666688', letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '0 0 24px' }
const serviceRow = { marginBottom: '20px' }
const serviceIcon = { width: '28px', verticalAlign: 'top' }
const iconText = { fontSize: '16px', color: '#00B8AC', margin: '2px 0 0', padding: '0' }
const serviceBody = { verticalAlign: 'top', paddingLeft: '8px' }
const serviceTitle = { fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 4px' }
const serviceDesc = { fontSize: '13px', color: '#8888a0', lineHeight: '1.6', margin: '0' }

const ctaSection = { padding: '36px 48px', textAlign: 'center' as const }
const ctaHeading = { fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.01em' }
const ctaBody = { fontSize: '14px', color: '#a0a0b0', lineHeight: '1.7', margin: '0 0 24px' }

const footer = { padding: '24px 48px 40px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#44445a', lineHeight: '1.8', margin: '0' }
const footerLink = { color: '#44445a', textDecoration: 'underline' }
