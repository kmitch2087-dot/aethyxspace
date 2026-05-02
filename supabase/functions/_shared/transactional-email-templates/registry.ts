/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as inquiryNotification } from './inquiry-notification.tsx'
import { template as intakeNotification } from './intake-notification.tsx'
import { template as intakeConfirmation } from './intake-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'inquiry-notification': inquiryNotification,
  'intake-notification': intakeNotification,
  'intake-confirmation': intakeConfirmation,
}
