import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sendComposedEmail } from '@/lib/email'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, type, subject, body } = await req.json()

  if (!memberId || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!member.guardianEmail) return NextResponse.json({ error: 'No guardian email on file' }, { status: 422 })

  await sendComposedEmail({
    to:           member.guardianEmail,
    guardianName: member.guardianName ?? 'Parent/Guardian',
    subject,
    body,
  })

  await prisma.notification.create({
    data: {
      memberId,
      type:    type || 'custom',
      channel: 'email',
      content: subject,
    },
  })

  return NextResponse.json({ ok: true })
}
