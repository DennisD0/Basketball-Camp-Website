import AttendanceCalendar from '@/components/attendance/attendance-calendar'

export default function AttendancePage() {
  const now = new Date()
  return (
    <div className="max-w-sm sm:max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Select a date to view who attended that session.</p>
      </div>
      <AttendanceCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
    </div>
  )
}
