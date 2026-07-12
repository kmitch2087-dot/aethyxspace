/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  /** 'personal' → "Kristin at Aethyx" | 'brand' → "Aethyx Web Design". Defaults to 'personal'. */
  senderType?: 'personal' | 'brand'
  displayName?: string
  previewData?: Record<string, any>
}

import { template as inquiryNotification } from './inquiry-notification.tsx'
import { template as intakeNotification } from './intake-notification.tsx'
import { template as intakeConfirmation } from './intake-confirmation.tsx'
import { template as portalInvite } from './portal-invite.tsx'
import { template as portalActivationNotification } from './portal-activation-notification.tsx'
import { template as newInvoice } from './new-invoice.tsx'
import { template as paymentReceived } from './payment-received.tsx'
import { template as documentShare } from './document-share.tsx'
import { template as invoiceDelivery } from './invoice-delivery.tsx'
import { template as intakeRequired } from './intake-required.tsx'
import { template as newDocuments } from './new-documents.tsx'
import { template as feeWaived } from './fee-waived.tsx'
import { template as marketingServicesSpotlight } from './marketing-services-spotlight.tsx'
import { template as referralSigned } from './referral-signed.tsx'
import { template as referralPayout } from './referral-payout.tsx'
import { template as addOnActivated } from './add-on-activated.tsx'
import { template as bountyApproved } from './bounty-approved.tsx'
import { template as adminCompose } from './admin-compose.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'inquiry-notification': inquiryNotification,
  'intake-notification': intakeNotification,
  'intake-confirmation': intakeConfirmation,
  'portal-invite': portalInvite,
  'portal-activation-notification': portalActivationNotification,
  'new-invoice': newInvoice,
  'payment-received': paymentReceived,
  'document-share': documentShare,
  'invoice-delivery': invoiceDelivery,
  'intake-required': intakeRequired,
  'new-documents': newDocuments,
  'fee-waived': feeWaived,
  'marketing-services-spotlight': marketingServicesSpotlight,
  'referral-signed': referralSigned,
  'referral-payout': referralPayout,
  'add-on-activated': addOnActivated,
  'bounty-approved': bountyApproved,
  'admin-compose': adminCompose,
}
