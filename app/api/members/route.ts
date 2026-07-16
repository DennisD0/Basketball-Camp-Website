import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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

  try {
    const member = await prisma.member.create({
      data: {
        firstName:      firstName.trim(),
        lastName:       lastName.trim(),
        dateOfBirth:    dateOfBirth ? new Date(dateOfBirth) : null,
        teamAssignment: teamAssignment?.trim() || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
        guardianName:   guardianName?.trim() || null,
        guardianEmail:  guardianEmail?.trim() || null,
        guardianPhone:  guardianPhone?.trim() || null,
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
