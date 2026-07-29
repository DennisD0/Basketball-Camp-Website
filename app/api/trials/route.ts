import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { withImportKeys } from '@/lib/import-key'

async function auth() {
  const c = await cookies()
  return c.has('auth')
}

export async function GET() {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const trials = await prisma.trialStudent.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(trials)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Bulk import: { rows: [...] }
  if (Array.isArray(body.rows)) {
    try {
      const keyed = withImportKeys<{
        name: string; classTime?: string; guardianName?: string; guardianPhone?: string;
        email?: string; age?: number; packageInterest?: string; classPref?: string; notes?: string;
      }>('trial', body.rows, r => [r.name, r.classTime, r.guardianPhone])
      const created = await prisma.trialStudent.createMany({
        data: keyed.map(r => ({
          name: r.name,
          importKey: r.importKey,
          classTime: r.classTime || null,
          guardianName: r.guardianName || null,
          guardianPhone: r.guardianPhone || null,
          email: r.email || null,
          age: r.age || null,
          packageInterest: r.packageInterest || null,
          classPref: r.classPref || null,
          notes: r.notes || null,
        })),
        skipDuplicates: true,
      })
      return NextResponse.json({ created: created.count, skipped: keyed.length - created.count })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // Single create
  const { name, classTime, guardianName, guardianPhone, email, age, packageInterest, classPref, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  try {
    const t = await prisma.trialStudent.create({
      data: {
        name: name.trim(),
        classTime: classTime || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
        email: email || null,
        age: age ? parseInt(age) : null,
        packageInterest: packageInterest || null,
        classPref: classPref || null,
        notes: notes || null,
      },
    })
    return NextResponse.json(t, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await prisma.trialStudent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
