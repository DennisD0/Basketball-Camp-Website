import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const member = await prisma.member.findUnique({ where: { id } })
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(member)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { firstName, lastName, dateOfBirth, teamAssignment, enrollmentDate, guardianName, guardianEmail, guardianPhone } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
  }

  try {
    const member = await prisma.member.update({
      where: { id },
      data: {
        firstName:      firstName.trim(),
        lastName:       lastName.trim(),
        dateOfBirth:    dateOfBirth ? new Date(dateOfBirth) : null,
        teamAssignment: teamAssignment?.trim() || null,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        guardianName:   guardianName?.trim() || null,
        guardianEmail:  guardianEmail?.trim() || null,
        guardianPhone:  guardianPhone?.trim() || null,
      },
    })
    return NextResponse.json(member)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const member = await prisma.member.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    })
    return NextResponse.json(member)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
