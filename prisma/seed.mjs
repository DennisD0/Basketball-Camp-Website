import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const members = [
  // U12 Basketball
  { firstName: 'Marcus',   lastName: 'Johnson',    dateOfBirth: new Date('2014-03-15'), teamAssignment: 'U12 Basketball', guardianName: 'Linda Johnson',     guardianEmail: 'linda.johnson@email.com',    guardianPhone: '(413) 555-0101', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Darius',   lastName: 'Williams',   dateOfBirth: new Date('2013-11-22'), teamAssignment: 'U12 Basketball', guardianName: 'Robert Williams',    guardianEmail: 'rwilliams@email.com',        guardianPhone: '(413) 555-0102', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Jaylen',   lastName: 'Brown',      dateOfBirth: new Date('2014-07-08'), teamAssignment: 'U12 Basketball', guardianName: 'Angela Brown',       guardianEmail: 'angela.brown@email.com',     guardianPhone: '(413) 555-0103', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Malik',    lastName: 'Davis',      dateOfBirth: new Date('2013-09-14'), teamAssignment: 'U12 Basketball', guardianName: 'Michael Davis',      guardianEmail: 'mdavis@email.com',           guardianPhone: '(413) 555-0104', enrollmentDate: new Date('2025-10-01') },
  { firstName: 'Isaiah',   lastName: 'Thomas',     dateOfBirth: new Date('2014-01-30'), teamAssignment: 'U12 Basketball', guardianName: 'Sarah Thomas',       guardianEmail: 'sarah.thomas@email.com',     guardianPhone: '(413) 555-0105', enrollmentDate: new Date('2025-10-01') },
  // U14 Basketball
  { firstName: 'DeShawn',  lastName: 'Carter',     dateOfBirth: new Date('2012-05-17'), teamAssignment: 'U14 Basketball', guardianName: 'James Carter',       guardianEmail: 'james.carter@email.com',     guardianPhone: '(413) 555-0201', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Trevon',   lastName: 'Harris',     dateOfBirth: new Date('2011-12-03'), teamAssignment: 'U14 Basketball', guardianName: 'Tamika Harris',      guardianEmail: 'tamika.harris@email.com',    guardianPhone: '(413) 555-0202', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Jordan',   lastName: 'Mitchell',   dateOfBirth: new Date('2012-08-20'), teamAssignment: 'U14 Basketball', guardianName: 'David Mitchell',     guardianEmail: 'david.mitchell@email.com',   guardianPhone: '(413) 555-0203', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Elijah',   lastName: 'Robinson',   dateOfBirth: new Date('2012-02-11'), teamAssignment: 'U14 Basketball', guardianName: 'Patricia Robinson',  guardianEmail: 'p.robinson@email.com',       guardianPhone: '(413) 555-0204', enrollmentDate: new Date('2025-10-15') },
  { firstName: 'Kofi',     lastName: 'Mensah',     dateOfBirth: new Date('2011-06-28'), teamAssignment: 'U14 Basketball', guardianName: 'Kwame Mensah',       guardianEmail: 'kwame.mensah@email.com',     guardianPhone: '(413) 555-0205', enrollmentDate: new Date('2025-10-15') },
  // U16 Basketball
  { firstName: 'Tyler',    lastName: 'Washington', dateOfBirth: new Date('2010-04-05'), teamAssignment: 'U16 Basketball', guardianName: 'Denise Washington',  guardianEmail: 'denise.wash@email.com',      guardianPhone: '(413) 555-0301', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Antoine',  lastName: 'Lewis',      dateOfBirth: new Date('2010-07-24'), teamAssignment: 'U16 Basketball', guardianName: 'Carla Lewis',        guardianEmail: 'carla.lewis@email.com',      guardianPhone: '(413) 555-0302', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Brandon',  lastName: 'Scott',      dateOfBirth: new Date('2009-03-12'), teamAssignment: 'U16 Basketball', guardianName: 'Kevin Scott',        guardianEmail: 'kevin.scott@email.com',      guardianPhone: '(413) 555-0303', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Dominic',  lastName: 'Perez',      dateOfBirth: new Date('2010-11-07'), teamAssignment: 'U16 Basketball', guardianName: 'Maria Perez',        guardianEmail: 'maria.perez@email.com',      guardianPhone: '(413) 555-0304', enrollmentDate: new Date('2025-10-01') },
  { firstName: 'Jaylen',   lastName: 'Adams',      dateOfBirth: new Date('2009-10-19'), teamAssignment: 'U16 Basketball', guardianName: 'Marcus Adams',       guardianEmail: 'marcus.adams@email.com',     guardianPhone: '(413) 555-0305', enrollmentDate: new Date('2025-10-01') },
  // U12 Volleyball
  { firstName: 'Aisha',    lastName: 'Johnson',    dateOfBirth: new Date('2014-02-10'), teamAssignment: 'U12 Volleyball', guardianName: 'Patricia Johnson',  guardianEmail: 'p.johnson@email.com',        guardianPhone: '(413) 555-0401', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Maya',     lastName: 'Williams',   dateOfBirth: new Date('2013-08-15'), teamAssignment: 'U12 Volleyball', guardianName: 'Patricia Williams', guardianEmail: 'p.williams@email.com',       guardianPhone: '(413) 555-0402', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Sofia',    lastName: 'Rodriguez',  dateOfBirth: new Date('2014-05-22'), teamAssignment: 'U12 Volleyball', guardianName: 'Carlos Rodriguez',  guardianEmail: 'c.rodriguez@email.com',      guardianPhone: '(413) 555-0403', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Destiny',  lastName: 'Brown',      dateOfBirth: new Date('2013-12-01'), teamAssignment: 'U12 Volleyball', guardianName: 'James Brown',       guardianEmail: 'j.brown@email.com',          guardianPhone: '(413) 555-0404', enrollmentDate: new Date('2025-10-01') },
  { firstName: 'Zara',     lastName: 'Mitchell',   dateOfBirth: new Date('2014-09-18'), teamAssignment: 'U12 Volleyball', guardianName: 'Sandra Mitchell',   guardianEmail: 's.mitchell@email.com',       guardianPhone: '(413) 555-0405', enrollmentDate: new Date('2025-10-01') },
  // U14 Volleyball
  { firstName: 'Aaliyah',  lastName: 'Carter',     dateOfBirth: new Date('2012-03-28'), teamAssignment: 'U14 Volleyball', guardianName: 'Michael Carter',   guardianEmail: 'm.carter@email.com',         guardianPhone: '(413) 555-0501', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Brianna',  lastName: 'Harris',     dateOfBirth: new Date('2011-11-14'), teamAssignment: 'U14 Volleyball', guardianName: 'Denise Harris',    guardianEmail: 'd.harris@email.com',         guardianPhone: '(413) 555-0502', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Jasmine',  lastName: 'Thomas',     dateOfBirth: new Date('2012-07-09'), teamAssignment: 'U14 Volleyball', guardianName: 'Robert Thomas',    guardianEmail: 'r.thomas@email.com',         guardianPhone: '(413) 555-0503', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Kyla',     lastName: 'Davis',      dateOfBirth: new Date('2011-04-25'), teamAssignment: 'U14 Volleyball', guardianName: 'Angela Davis',     guardianEmail: 'a.davis@email.com',          guardianPhone: '(413) 555-0504', enrollmentDate: new Date('2025-10-15') },
  { firstName: 'Mia',      lastName: 'Washington', dateOfBirth: new Date('2012-01-17'), teamAssignment: 'U14 Volleyball', guardianName: 'Kevin Washington', guardianEmail: 'k.washington@email.com',     guardianPhone: '(413) 555-0505', enrollmentDate: new Date('2025-10-15') },
  // U16 Volleyball
  { firstName: 'Naomi',    lastName: 'Lewis',      dateOfBirth: new Date('2010-06-30'), teamAssignment: 'U16 Volleyball', guardianName: 'Charles Lewis',    guardianEmail: 'c.lewis@email.com',          guardianPhone: '(413) 555-0601', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Precious', lastName: 'Scott',      dateOfBirth: new Date('2009-09-05'), teamAssignment: 'U16 Volleyball', guardianName: 'Brenda Scott',     guardianEmail: 'b.scott@email.com',          guardianPhone: '(413) 555-0602', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Renee',    lastName: 'Perez',      dateOfBirth: new Date('2010-03-21'), teamAssignment: 'U16 Volleyball', guardianName: 'Manuel Perez',     guardianEmail: 'manuel.perez@email.com',     guardianPhone: '(413) 555-0603', enrollmentDate: new Date('2025-09-01') },
  { firstName: 'Simone',   lastName: 'Adams',      dateOfBirth: new Date('2009-12-12'), teamAssignment: 'U16 Volleyball', guardianName: 'Lisa Adams',       guardianEmail: 'lisa.adams@email.com',       guardianPhone: '(413) 555-0604', enrollmentDate: new Date('2025-10-01') },
  { firstName: 'Tiana',    lastName: 'Robinson',   dateOfBirth: new Date('2010-08-08'), teamAssignment: 'U16 Volleyball', guardianName: 'Marcus Robinson',  guardianEmail: 'marcus.robinson@email.com',  guardianPhone: '(413) 555-0605', enrollmentDate: new Date('2025-10-01') },
]

const payments = [
  { memberIndex: 0,  amount: 50, method: 'CASH',          date: new Date('2025-11-01'), notes: 'November fee' },
  { memberIndex: 1,  amount: 50, method: 'BANK_TRANSFER', date: new Date('2025-11-03'), notes: null },
  { memberIndex: 2,  amount: 50, method: 'CASH',          date: new Date('2025-11-05'), notes: null },
  { memberIndex: 5,  amount: 50, method: 'CASH',          date: new Date('2025-11-02'), notes: 'November fee' },
  { memberIndex: 6,  amount: 50, method: 'BANK_TRANSFER', date: new Date('2025-11-04'), notes: null },
  { memberIndex: 7,  amount: 100, method: 'BANK_TRANSFER', date: new Date('2025-11-01'), notes: 'Oct + Nov' },
  { memberIndex: 10, amount: 50, method: 'CASH',          date: new Date('2025-11-03'), notes: null },
  { memberIndex: 15, amount: 50, method: 'CASH',          date: new Date('2025-11-02'), notes: 'November fee' },
  { memberIndex: 16, amount: 50, method: 'BANK_TRANSFER', date: new Date('2025-11-05'), notes: null },
  { memberIndex: 20, amount: 50, method: 'CASH',          date: new Date('2025-11-01'), notes: null },
  { memberIndex: 21, amount: 50, method: 'BANK_TRANSFER', date: new Date('2025-11-04'), notes: null },
  { memberIndex: 25, amount: 50, method: 'CASH',          date: new Date('2025-11-03'), notes: 'November fee' },
]

// Demo registrations — mix of PENDING / APPROVED / REJECTED
const registrations = [
  // Original 4
  { parentName: 'Karen Thompson',  parentPhone: '(413) 555-7001', whatsappConsent: true,  childName: 'Liam Thompson',    programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'David Nguyen',    parentPhone: '(413) 555-7002', whatsappConsent: true,  childName: 'Emma Nguyen',      programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Monica Clarke',   parentPhone: '(413) 555-7003', whatsappConsent: false, childName: 'Noah Clarke',      programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U16', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'James Park',      parentPhone: '(413) 555-7004', whatsappConsent: true,  childName: 'Olivia Park',      programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  // 30 more
  { parentName: 'Sandra Lee',      parentPhone: '(718) 555-1001', whatsappConsent: true,  childName: 'Caleb Lee',        programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Anthony Rivera',  parentPhone: '(718) 555-1002', whatsappConsent: true,  childName: 'Mia Rivera',       programOption: 'memorial_day', sport: 'Volleyball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Tanya Brooks',    parentPhone: '(718) 555-1003', whatsappConsent: false, childName: 'Ethan Brooks',     programOption: 'regular',      sport: 'Basketball', ageGroup: 'U14', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Kevin Morrison',  parentPhone: '(718) 555-1004', whatsappConsent: true,  childName: 'Ava Morrison',     programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Lisa Chen',       parentPhone: '(718) 555-1005', whatsappConsent: true,  childName: 'Lucas Chen',       programOption: 'regular',      sport: 'Basketball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Michael Grant',   parentPhone: '(718) 555-1006', whatsappConsent: false, childName: 'Sofia Grant',      programOption: 'memorial_day', sport: 'Volleyball', ageGroup: 'U14', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'REJECTED' },
  { parentName: 'Rachel Kim',      parentPhone: '(718) 555-1007', whatsappConsent: true,  childName: 'Mason Kim',        programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Derek Okafor',    parentPhone: '(718) 555-1008', whatsappConsent: true,  childName: 'Isabella Okafor', programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Carmen Diaz',     parentPhone: '(718) 555-1009', whatsappConsent: true,  childName: 'Logan Diaz',       programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Brian Foster',    parentPhone: '(718) 555-1010', whatsappConsent: false, childName: 'Charlotte Foster', programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Angela Wu',       parentPhone: '(718) 555-1011', whatsappConsent: true,  childName: 'Elijah Wu',        programOption: 'memorial_day', sport: 'Basketball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Marcus Bell',     parentPhone: '(718) 555-1012', whatsappConsent: true,  childName: 'Amelia Bell',      programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U14', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Stephanie Hunt',  parentPhone: '(718) 555-1013', whatsappConsent: false, childName: 'James Hunt',       programOption: 'regular',      sport: 'Basketball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'REJECTED' },
  { parentName: 'Patrick Owens',   parentPhone: '(718) 555-1014', whatsappConsent: true,  childName: 'Harper Owens',     programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Nicole Freeman',  parentPhone: '(718) 555-1015', whatsappConsent: true,  childName: 'Aiden Freeman',    programOption: 'regular',      sport: 'Basketball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Chris Patel',     parentPhone: '(718) 555-1016', whatsappConsent: true,  childName: 'Evelyn Patel',     programOption: 'memorial_day', sport: 'Volleyball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Donna Simmons',   parentPhone: '(718) 555-1017', whatsappConsent: false, childName: 'Oliver Simmons',   programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U16', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Raymond Cruz',    parentPhone: '(718) 555-1018', whatsappConsent: true,  childName: 'Abigail Cruz',     programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Pamela Torres',   parentPhone: '(718) 555-1019', whatsappConsent: true,  childName: 'Jackson Torres',   programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Victor Hayes',    parentPhone: '(718) 555-1020', whatsappConsent: true,  childName: 'Scarlett Hayes',   programOption: 'memorial_day', sport: 'Volleyball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'REJECTED' },
  { parentName: 'Gloria Price',    parentPhone: '(718) 555-1021', whatsappConsent: false, childName: 'Sebastian Price',  programOption: 'regular',      sport: 'Basketball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Walter Jenkins',  parentPhone: '(718) 555-1022', whatsappConsent: true,  childName: 'Luna Jenkins',     programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Sheryl Coleman',  parentPhone: '(718) 555-1023', whatsappConsent: true,  childName: 'Henry Coleman',    programOption: 'regular',      sport: 'Basketball', ageGroup: 'U16', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Jerome Reed',     parentPhone: '(718) 555-1024', whatsappConsent: true,  childName: 'Grace Reed',       programOption: 'memorial_day', sport: 'Volleyball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Beverly Ross',    parentPhone: '(718) 555-1025', whatsappConsent: false, childName: 'Leo Ross',         programOption: 'early_bird',   sport: 'Basketball', ageGroup: 'U12', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
  { parentName: 'Herbert Morgan',  parentPhone: '(718) 555-1026', whatsappConsent: true,  childName: 'Chloe Morgan',     programOption: 'regular',      sport: 'Volleyball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Theresa Murphy',  parentPhone: '(718) 555-1027', whatsappConsent: true,  childName: 'Owen Murphy',      programOption: 'memorial_day', sport: 'Basketball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'Carlos Flores',   parentPhone: '(718) 555-1028', whatsappConsent: true,  childName: 'Penelope Flores',  programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U12', mediaConsent: false, injuryWaiver: true, noRefundAck: true, status: 'REJECTED' },
  { parentName: 'Denise Perez',    parentPhone: '(718) 555-1029', whatsappConsent: false, childName: 'Wyatt Perez',      programOption: 'regular',      sport: 'Basketball', ageGroup: 'U16', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'PENDING'  },
  { parentName: 'George Sanders',  parentPhone: '(718) 555-1030', whatsappConsent: true,  childName: 'Lily Sanders',     programOption: 'early_bird',   sport: 'Volleyball', ageGroup: 'U14', mediaConsent: true,  injuryWaiver: true, noRefundAck: true, status: 'APPROVED' },
]

async function main() {
  const existing = await prisma.member.count()
  if (existing >= 30) {
    console.log(`Already seeded (${existing} members) — skipping members.`)
  } else {
    await prisma.payment.deleteMany()
    await prisma.member.deleteMany()

    const created = await prisma.member.createManyAndReturn({ data: members })
    console.log(`Seeded ${created.length} members across 6 teams.`)

    const paymentData = payments.map(p => ({
      memberId: created[p.memberIndex].id,
      amount:   p.amount,
      method:   p.method,
      date:     p.date,
      notes:    p.notes,
    }))
    await prisma.payment.createMany({ data: paymentData })
    console.log(`Seeded ${paymentData.length} demo payments.`)
  }

  const existingRegs = await prisma.registration.count()
  if (existingRegs < 34) {
    await prisma.registration.createMany({ data: registrations })
    console.log(`Seeded ${registrations.length} demo registrations.`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
