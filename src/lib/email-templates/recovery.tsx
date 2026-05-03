import * as React from 'react'
import { Text } from '@react-email/components'
import { CTAButton, EmailShell, s } from './_shared'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailShell preview={`Reset your password for ${siteName}`}>
    <Text style={s.h1}>Reset your password</Text>
    <Text style={s.text}>
      We received a request to reset the password for your {siteName} account.
      Click the button below to choose a new one.
    </Text>
    <CTAButton href={confirmationUrl}>Reset password</CTAButton>
    <Text style={s.muted}>
      If you didn't request a password reset, you can safely ignore this email —
      your password won't be changed.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
