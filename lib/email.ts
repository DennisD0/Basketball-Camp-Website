const FROM = '413 Youth Club <onboarding@resend.dev>'

function wrap(guardianName: string, bodyText: string) {
  // Convert plain-text line breaks to HTML paragraphs
  const paragraphs = bodyText
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `
    <div style="font-family:Inter,Helvetica,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#ffffff">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#2C6E6A;color:#fff;font-weight:700;font-size:15px;padding:10px 16px;border-radius:10px;margin-bottom:28px">
        413 Youth Club
      </div>
      <div style="font-size:15px;color:#333">${paragraphs}</div>
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999">
        This message was sent via the 413 Youth Club management portal.
      </div>
    </div>`
}

export async function sendComposedEmail({
  to, guardianName, subject, body,
}: {
  to: string; guardianName: string; subject: string; body: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email mock] To: ${to}`)
    console.log(`[Email mock] Subject: ${subject}`)
    console.log(`[Email mock] Body:\n${body}`)
    return { id: 'mock' }
  }

  const { Resend } = await import('resend')
  return new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM,
    to,
    subject,
    html: wrap(guardianName, body),
  })
}
