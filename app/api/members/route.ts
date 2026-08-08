import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { MANUAL_ENTRY_NOTE, utcToday } from '@/lib/packages'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const members = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(members)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { firstName, lastName, dateOfBirth, teamAssignment, enrollmentDate, guardianName, guardianEmail, guardianPhone } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
  }

  // Absent means an older client that predates the package fields — fall back to
  // the Member schema default rather than rejecting the request.
  const sessionsTotal = body.sessionsTotal === undefined ? 8 : Number(body.sessionsTotal)
  if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1 || sessionsTotal > 100) {
    return NextResponse.json({ error: 'Sessions must be a whole number between 1 and 100' }, { status: 400 })
  }

  const packageType = typeof body.packageType === 'string' && body.packageType.trim()
    ? body.packageType.trim()
    : null

  // Backdatable, same as a coach-opened renewal: staff often enter a student
  // days after their first session.
  const startDate = typeof body.packageStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.packageStartDate)
    ? new Date(body.packageStartDate + 'T00:00:00Z')
    : utcToday()

  try {
    // Member and package are created together. A member without a package falls
    // to the legacy `sessionsUsed` column, which the attendance route never
    // writes — they would show full sessions remaining forever. One transaction
    // so a failure can never leave that state behind.
    const member = await prisma.$transaction(async tx => {
      const created = await tx.member.create({
        data: {
          firstName:      firstName.trim(),
          lastName:       lastName.trim(),
          dateOfBirth:    dateOfBirth ? new Date(dateOfBirth) : null,
          teamAssignment: teamAssignment?.trim() || null,
          enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
          guardianName:   guardianName?.trim() || null,
          guardianEmail:  guardianEmail?.trim() || null,
          guardianPhone:  guardianPhone?.trim() || null,
          sessionsTotal,
          packageType,
        },
      })

      await tx.memberPackage.create({
        data: {
          memberId: created.id,
          packageType,
          sessionsTotal,
          startDate,
          carriedUsed: 0,
          notes: MANUAL_ENTRY_NOTE,
        },
      })

      return created
    })
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
