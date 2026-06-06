import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    parentName, parentPhone, whatsappConsent,
    childName, programOption, sport, ageGroup,
    mediaConsent, injuryWaiver, noRefundAck,
  } = body

  if (!parentName || !parentPhone || !childName || !programOption || !sport || !ageGroup) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!injuryWaiver || !noRefundAck) {
    return NextResponse.json({ error: 'You must agree to the waiver and refund policy' }, { status: 400 })
  }

  const reg = await prisma.registration.create({
    data: {
      parentName,
      parentPhone,
      whatsappConsent: !!whatsappConsent,
      childName,
      programOption,
      sport,
      ageGroup,
      mediaConsent: !!mediaConsent,
      injuryWaiver: !!injuryWaiver,
      noRefundAck: !!noRefundAck,
      status: 'PENDING',
    },
  })

  return NextResponse.json(reg, { status: 201 })
}
