import * as React from 'react'
import { Text } from '@react-email/components'
import { CTAButton, EmailShell, s } from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailShell preview={`Your sign-in link for ${siteName}`}>
    <Text style={s.h1}>Sign in to {siteName}</Text>
    <Text style={s.text}>
      Click the button below to sign in. This link will expire shortly for your security.
    </Text>
    <CTAButton href={confirmationUrl}>Sign in</CTAButton>
    <Text style={s.muted}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
