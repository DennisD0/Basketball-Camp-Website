import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = await cookies()
  if (!c.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  try {
    const t = await prisma.trialStudent.update({
      where: { id },
      data: {
        converted: body.converted ?? undefined,
        notes: body.notes ?? undefined,
      },
    })
    return NextResponse.json(t)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
