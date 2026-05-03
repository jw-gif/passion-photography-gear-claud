import * as React from 'react'
import {
  Body,
  Button as REButton,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// Brand tokens — derived from src/styles.css (oklch values converted to hex
// for email-client compatibility; email clients do not support oklch).
export const brand = {
  // Email body MUST be white per deliverability guidance
  bodyBg: '#ffffff',
  // Warm light gray surface for the content card
  surface: '#f6f5f2',
  border: '#e2e0db',
  text: '#1a1a1a',
  muted: '#6b6b68',
  // Bright cyan brand accent
  primary: '#5bc7e8',
  primaryText: '#0c2733',
  link: '#0e7c97',
  radius: '12px',
  fontStack:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const styles = {
  main: {
    backgroundColor: brand.bodyBg,
    fontFamily: brand.fontStack,
    margin: 0,
    padding: '32px 16px',
  } as React.CSSProperties,
  container: {
    maxWidth: '560px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    padding: '0 4px 20px',
    textAlign: 'left' as const,
  },
  wordmark: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: brand.link,
    margin: 0,
  },
  card: {
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: brand.radius,
    padding: '40px 36px',
  } as React.CSSProperties,
  h1: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '1.25',
    color: brand.text,
    margin: '0 0 16px',
  } as React.CSSProperties,
  text: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: brand.text,
    margin: '0 0 16px',
  } as React.CSSProperties,
  muted: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: brand.muted,
    margin: '24px 0 0',
  } as React.CSSProperties,
  buttonWrap: {
    margin: '28px 0 8px',
  } as React.CSSProperties,
  button: {
    backgroundColor: brand.primary,
    color: brand.primaryText,
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '10px',
    padding: '14px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  } as React.CSSProperties,
  link: {
    color: brand.link,
    textDecoration: 'underline',
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: `1px solid ${brand.border}`,
    margin: '28px 0 20px',
  } as React.CSSProperties,
  code: {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: brand.text,
    backgroundColor: '#ffffff',
    border: `1px solid ${brand.border}`,
    borderRadius: '10px',
    padding: '16px 20px',
    textAlign: 'center' as const,
    display: 'block',
    margin: '20px 0 8px',
  } as React.CSSProperties,
  footer: {
    fontSize: '12px',
    color: brand.muted,
    textAlign: 'center' as const,
    margin: '24px 4px 0',
    lineHeight: '1.5',
  } as React.CSSProperties,
}

export interface ShellProps {
  preview: string
  children: React.ReactNode
}

export function EmailShell({ preview, children }: ShellProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>Passion Photography Team</Text>
          </Section>
          <Section style={styles.card}>{children}</Section>
          <Text style={styles.footer}>
            Sent by Passion Photography Team · email.passionphotography.team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export function CTAButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={styles.buttonWrap}>
      <REButton style={styles.button} href={href}>
        {children}
      </REButton>
    </Section>
  )
}

export const s = styles
