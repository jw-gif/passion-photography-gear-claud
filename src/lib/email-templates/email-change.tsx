import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { CTAButton, EmailShell, s } from './_shared'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={`Confirm your email change for ${siteName}`}>
    <Text style={s.h1}>Confirm your new email</Text>
    <Text style={s.text}>
      You requested to change your {siteName} email address from{' '}
      <Link href={`mailto:${oldEmail}`} style={s.link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={s.link}>
        {newEmail}
      </Link>
      .
    </Text>
    <CTAButton href={confirmationUrl}>Confirm email change</CTAButton>
    <Text style={s.muted}>
      If you didn't request this change, please secure your account immediately.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
