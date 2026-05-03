import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailShell, s } from './_shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Your verification code">
    <Text style={s.h1}>Confirm it's you</Text>
    <Text style={s.text}>
      Use the code below to confirm your identity and complete this action.
    </Text>
    <Text style={s.code}>{token}</Text>
    <Text style={s.muted}>
      This code will expire shortly. If you didn't request it, you can safely
      ignore this email.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
