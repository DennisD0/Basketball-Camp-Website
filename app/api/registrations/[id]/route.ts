import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { sendComposedEmail } from '@/lib/email'

const PROGRAM_LABELS: Record<string, string> = {
  early_bird:   'Early Bird ($350)',
  memorial_day: 'Memorial Day Sale ($300)',
  regular:      'Regular ($400)',
}

function approvalEmailBody(reg: { parentName: string; childName: string; sport: string; ageGroup: string; programOption: string }) {
  const program = PROGRAM_LABELS[reg.programOption] ?? reg.programOption
  return `Hi ${reg.parentName},

Great news — ${reg.childName}'s registration for 413 Youth Club (${reg.ageGroup} ${reg.sport}) has been approved!

Program: ${program}
Schedule: Mondays 6:30–8:30 PM · Saturdays 2:00–4:00 PM
Location: 58-06 Springfield Blvd, Oakland Gardens, NY

Payment Instructions
Zelle: 347-200-4439
Please include ${reg.childName}'s name in the memo. No spot is held until payment is received.

We can't wait to see ${reg.childName} on the court!

— Coach Ben & the 413 Youth Club staff`
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    const reg = await prisma.registration.update({ where: { id }, data: { status } })

    // Auto-create a Member when approved
    let memberId: string | null = null
    if (status === 'APPROVED') {
      const [firstName, ...rest] = reg.childName.trim().split(' ')
      const lastName = rest.join(' ') || '—'
      const teamAssignment = `${reg.ageGroup} ${reg.sport}`

      const member = await prisma.member.create({
        data: {
          firstName,
          lastName,
          teamAssignment,
          guardianName: reg.parentName,
          guardianEmail: reg.parentEmail,
          guardianPhone: reg.parentPhone,
          sessionsTotal: reg.packageOption === '5-week' ? 5 : 7,
          enrollmentDate: new Date(),
          status: 'ACTIVE',
        },
      })
      memberId = member.id

      if (reg.parentEmail) {
        await sendComposedEmail({
          to:           reg.parentEmail,
          guardianName: reg.parentName,
          subject:      `${reg.childName} is registered for 413 Youth Club! 🏀`,
          body:         approvalEmailBody(reg),
        })

        await prisma.notification.create({
          data: {
            memberId: member.id,
            type:     'registration_approved',
            channel:  'email',
            content:  `Approval confirmation sent to ${reg.parentEmail}`,
          },
        })
      }
    }

    return NextResponse.json({ ...reg, memberId })
  } catch (err) {
    console.error('[registrations/patch]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
