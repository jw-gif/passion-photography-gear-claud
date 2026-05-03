import * as React from 'react'
import { Text } from '@react-email/components'
import { CTAButton, EmailShell, s } from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <EmailShell preview={`You've been invited to ${siteName}`}>
    <Text style={s.h1}>You're invited</Text>
    <Text style={s.text}>
      You've been invited to join the <strong>{siteName}</strong> hub — where
      our team requests photography, manages gear, and tracks every shoot.
    </Text>
    <CTAButton href={confirmationUrl}>Accept invitation</CTAButton>
    <Text style={s.muted}>
      If you weren't expecting this, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default InviteEmail
