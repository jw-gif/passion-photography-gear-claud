import * as React from 'react'
import { Link, Text } from '@react-email/components'
import { CTAButton, EmailShell, s } from './_shared'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailShell preview={`Confirm your email for ${siteName}`}>
    <Text style={s.h1}>Confirm your email</Text>
    <Text style={s.text}>
      Welcome to the Passion Photography Team. Please confirm{' '}
      <Link href={`mailto:${recipient}`} style={s.link}>
        {recipient}
      </Link>{' '}
      so we can finish setting up your account.
    </Text>
    <CTAButton href={confirmationUrl}>Verify email</CTAButton>
    <Text style={s.muted}>
      If you didn't create an account, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default SignupEmail
