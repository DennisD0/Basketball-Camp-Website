import { redirect } from 'next/navigation'

// Expenses now live inside the Finances page (Expenses tab).
export default function ExpensesPage() {
  redirect('/finances')
}
