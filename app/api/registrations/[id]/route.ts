import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

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
        guardianPhone: reg.parentPhone,
        enrollmentDate: new Date(),
        status: 'ACTIVE',
      },
    })
    memberId = member.id
  }

  return NextResponse.json({ ...reg, memberId })
}
