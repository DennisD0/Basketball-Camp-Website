import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import MemberForm from '@/components/members/member-form'
import Link from 'next/link'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const member = await prisma.member.findUnique({ where: { id } })
  if (!member) notFound()

  const initialData = {
    firstName:      member.firstName,
    lastName:       member.lastName,
    dateOfBirth:    member.dateOfBirth?.toISOString().split('T')[0] ?? '',
    teamAssignment: member.teamAssignment ?? '',
    enrollmentDate: member.enrollmentDate.toISOString().split('T')[0],
    guardianName:   member.guardianName ?? '',
    guardianEmail:  member.guardianEmail ?? '',
    guardianPhone:  member.guardianPhone ?? '',
  }

  return (
    <div>
      <Link href={`/members/${id}`} className="text-sm text-gray-500 hover:text-brand-navy mb-4 block">
        ← {member.firstName} {member.lastName}
      </Link>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Edit member</h1>
      <MemberForm initialData={initialData} memberId={id} />
    </div>
  )
}
