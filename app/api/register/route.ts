import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    parentName, parentEmail, parentPhone, whatsappConsent,
    childName, programOption, sport, ageGroup,
    mediaConsent, injuryWaiver, noRefundAck,
    packageOption, printedName, signedDate, referredBy,
  } = body

  if (!parentName || !parentEmail || !parentPhone || !childName || !sport || !ageGroup) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!programOption || programOption === '_') {
    return NextResponse.json({ error: 'Please select a valid sport and pricing option' }, { status: 400 })
  }
  if (!injuryWaiver || !noRefundAck) {
    return NextResponse.json({ error: 'You must agree to the waiver and refund policy' }, { status: 400 })
  }

  const reg = await prisma.registration.create({
    data: {
      parentName,
      parentEmail,
      parentPhone,
      whatsappConsent: !!whatsappConsent,
      childName,
      programOption,
      sport,
      ageGroup,
      mediaConsent: !!mediaConsent,
      injuryWaiver: !!injuryWaiver,
      noRefundAck: !!noRefundAck,
      packageOption: packageOption ?? '5_sessions',
      printedName: printedName ?? null,
      signedDate: signedDate ?? null,
      referredBy: referredBy ?? null,
      status: 'PENDING',
    },
  })

  return NextResponse.json(reg, { status: 201 })
}
