import MemberForm from '@/components/members/member-form'
import Link from 'next/link'

export default function NewMemberPage() {
  return (
    <div>
      <Link href="/members" className="text-sm text-gray-500 hover:text-brand-navy mb-4 block">
        ← Members
      </Link>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Add member</h1>
      <MemberForm />
    </div>
  )
}
