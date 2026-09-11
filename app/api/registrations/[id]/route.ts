import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { sendComposedEmail } from '@/lib/email'
import { openNewPackage, REGISTRATION_NOTE } from '@/lib/packages'
import { resolveProgram, resolveSessionsTotal } from '@/lib/programs'
import { getRegistrationConfig } from '@/lib/get-registration-config'
import type { SessionPackage } from '@/lib/registration-config'

function approvalEmailBody(
  reg: { parentName: string; childName: string; sport: string; ageGroup: string; programOption: string; packageOption: string },
  packages: SessionPackage[],
) {
  // Previously a local map of three legacy keys, so a parent who bought any
  // staff-created package was emailed the raw value — "Program:
  // volleyball_package_1785855391156" — instead of what they paid for.
  const resolved = resolveProgram(reg, packages)
  const program = `${resolved.title} — ${resolved.price}`
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

      // What the parent picked, read from the live config — never guessed from
      // two legacy package names. See `resolveSessionsTotal`.
      const { config } = await getRegistrationConfig()
      const resolvedSessions = resolveSessionsTotal(reg, config.packages)
      if (resolvedSessions === null) {
        // No package on file answers this. Credit the smallest package we sell
        // rather than the largest: a coach topping a student up is a two-tap fix,
        // sessions given away that were never paid for are not.
        console.warn('[registrations/patch] unknown package', reg.packageOption, '— defaulting to 5 sessions')
      }
      const sessionsTotal = resolvedSessions ?? 5
      const program = resolveProgram(reg, config.packages)

      const member = await prisma.member.create({
        data: {
          firstName,
          lastName,
          teamAssignment,
          guardianName: reg.parentName,
          guardianEmail: reg.parentEmail,
          guardianPhone: reg.parentPhone,
          sessionsTotal,
          enrollmentDate: new Date(),
          status: 'ACTIVE',
        },
      })
      memberId = member.id

      // Open their first package so check-ins decrement from day one. Without
      // this the member falls back to the legacy columns, which attendance
      // never writes to, and their counter would sit at full forever.
      // The package label, not the raw `basketball_5_sessions` key — this string
      // is shown to a coach on the member's sessions card.
      await openNewPackage(member.id, {
        sessionsTotal,
        packageType: program.packageLabel,
        notes: REGISTRATION_NOTE,
      })

      if (reg.parentEmail) {
        await sendComposedEmail({
          to:           reg.parentEmail,
          guardianName: reg.parentName,
          subject:      `${reg.childName} is registered for 413 Youth Club! 🏀`,
          body:         approvalEmailBody(reg, config.packages),
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
