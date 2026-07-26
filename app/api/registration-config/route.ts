import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { getRegistrationConfig, REGISTRATION_CONFIG_KEY } from '@/lib/get-registration-config'
import type { RegistrationConfig } from '@/lib/registration-config'

export async function GET() {
  const { config, custom } = await getRegistrationConfig()
  return NextResponse.json({ config, custom })
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { config }: { config: RegistrationConfig } = await req.json()

  if (!config?.programInfo || !Array.isArray(config.packages) || config.packages.length === 0) {
    return NextResponse.json({ error: 'Missing program info or session packages' }, { status: 400 })
  }
  if (!Array.isArray(config.sports) || config.sports.length === 0) {
    return NextResponse.json({ error: 'At least one sport is required' }, { status: 400 })
  }
  if (!Array.isArray(config.contractSections) || config.contractSections.some(s => !s.title?.trim() || !s.body?.trim())) {
    return NextResponse.json({ error: 'Every contract section needs a title and body' }, { status: 400 })
  }

  try {
    await prisma.setting.upsert({
      where: { key: REGISTRATION_CONFIG_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: REGISTRATION_CONFIG_KEY, value: JSON.stringify(config) },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Reset to defaults
export async function DELETE() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.setting.deleteMany({ where: { key: REGISTRATION_CONFIG_KEY } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
