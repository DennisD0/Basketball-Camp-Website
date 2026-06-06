import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.payment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
