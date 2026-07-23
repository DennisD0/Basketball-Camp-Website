'use client'

import { useState } from 'react'

export default function ContractSignature() {
  const [printedName, setPrintedName] = useState('')
  const [signedDate, setSignedDate] = useState('')

  return (
    <div className="mt-10 pt-8 border-t-2 border-gray-900 no-print-hide">
      <p className="text-xs text-gray-500 mb-6">
        By signing below, the parent/guardian confirms all information above is accurate and agrees to all terms stated in this registration agreement.
      </p>

      <div className="grid grid-cols-2 gap-10">
        {/* Signature */}
        <div>
          <div className="border-b-2 border-gray-900 h-14 mb-1" />
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Parent / Guardian Signature</p>
        </div>

        {/* Date */}
        <div>
          <input
            type="text"
            value={signedDate}
            onChange={e => setSignedDate(e.target.value)}
            placeholder="MM / DD / YYYY"
            className="w-full border-b-2 border-gray-900 h-14 bg-transparent text-base font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none pb-1"
          />
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">Date</p>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          value={printedName}
          onChange={e => setPrintedName(e.target.value)}
          placeholder="Type full name here"
          className="w-full border-b-2 border-gray-900 h-14 bg-transparent text-base font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none pb-1"
        />
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">Printed Name</p>
      </div>
    </div>
  )
}
