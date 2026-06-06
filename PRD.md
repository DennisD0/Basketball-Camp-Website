# 413 Youth Club — Platform PRD
**Last updated:** June 2026  
**Status:** MVP complete — demo-ready, client presentation build

---

## What This Is

A full-stack web platform for 413 Youth Club — a youth sports organization in Oakland Gardens, NY running Basketball and Volleyball programs for ages 12–16. It replaces Google Forms, Excel fee tracking, and ad-hoc parent communication.

The platform has two distinct layers:
- **Public marketing site** — visible without login, used to attract and register new players
- **Staff portal (dashboard)** — login-protected, used by admin/coach to manage members, payments, and registrations

---

## The Programs

- **Sports:** Basketball, Volleyball (both run on the same weekly schedule)
- **Age groups:** U12, U14, U16
- **Season:** Summer program — 4 weeks (July–August)
- **Schedule:** Mondays 6:30–8:30 PM, Saturdays 2:00–4:00 PM
- **Location:** 58-06 Springfield Blvd, Oakland Gardens, NY
- **Pricing:** Memorial Day $300 / Early Bird $350 / Regular $400
- **Payment methods:** Zelle (347-200-4439) and Venmo (@benro97)

---

## Users

| Role | Access | Auth |
|------|--------|------|
| Public visitor | Landing page + registration form only | None |
| Staff/Admin | Full dashboard — members, finances, registrations | Single password (`ADMIN_PASSWORD` env var) |

**Production upgrade:** Replace single-password auth with Supabase role-based accounts (admin, coach). Add parent login to view their child's profile.

---

## Public Site Features

### Landing Page (`/`)
Marketing page targeting parents and players. Sections:
- Hero with tagline and primary CTA
- Problem/solution framing ("most programs have kids play — we develop them")
- Program tiles (Basketball + Volleyball) with curriculum breakdown
- 4-week training curriculum timeline
- Stats bar
- Coach bio (Coach Ben — 15+ years, 2015 PSAL Champion, MS teacher)
- Parent/player testimonials
- Schedule + location
- Pricing tiers
- FAQ
- Final CTA

**Design language:** Passive/warm UI — cream background (`#EAE4D8`), brand navy (`#2D3875`), orange (`#C85A1E`), teal (`#2C6E6A`). Rounded-2xl cards, hover lifts, `active:scale-95` press feedback, animated nav underlines. Scroll-triggered fade-up via `AnimateIn` component. Kids basketball/volleyball photos via Unsplash CDN.

**Design reference:** PGC Basketball (pgcbasketball.com) — problem/solution structure, trust signals, multiple CTAs

### Registration Form (`/register`)
Replaces the Google Form. Fields:
- Parent name, phone, WhatsApp consent
- Child name, sport, age group, program option (pricing tier)
- Media consent, injury waiver, no-refund acknowledgment

Submissions land in the dashboard as **PENDING** and must be approved by staff.

---

## Dashboard Features

### Members (`/members`)
- Player profiles: name, DOB, team, enrollment date, status, guardian info
- Add / edit / archive members
- **Card grid view** with team filter tabs (All / U12 Basketball / U14 Basketball / etc.)
- Color-coded avatar initials (navy = basketball, teal = volleyball)
- Paid/Unpaid badge per card derived from payment records
- Per-member detail page with payment history and guardian email compose

### Finances (`/finances`)
- Record payments: member, amount, method (Cash / Bank Transfer), date, notes
- Payment history table with delete
- Stats: total collected, this month, members with no payment

### Registrations (`/registrations`)
- Review pending registration form submissions in a card grid
- Filter tabs: Pending / Approved / Rejected / All with live counts
- **Approve → auto-creates Member record** from registration data (name split, team derived from ageGroup + sport)
- "View profile →" link shown on card after approval
- Reject marks status and updates card inline — no page reload

### Email (`/members/[id]`)
- Compose and send emails to parents directly from member profile
- Pre-filled templates: Absence Alert, Payment Reminder
- Fully editable subject + body before sending
- Sent via Resend (falls back to console.log in demo without API key)
- Email log stored in `Notification` table

### Dashboard Overview (`/dashboard`)
- Pending registrations banner (links to `/registrations`)
- Stat cards: Active Members, Teams, Avg Attendance, Outstanding Fees
- **Revenue area chart** — cumulative day-by-day This Month vs Last Month (Recharts AreaChart)
- **Revenue card** — this month + all season sub-cards, weekly bar chart (hidden when no data)
- **Payment Breakdown** — Cash vs Bank Transfer horizontal progress bars with counts
- **Registration Stats** — SVG semi-circle arc gauge showing approval rate + status rows
- Attendance bar chart (mock data in demo — wire to real attendance table in production)
- Team breakdown donut chart
- Flagged members and recent members panels

---

## Tech Stack

| Layer | Demo (current) | Production (planned) |
|-------|---------------|---------------------|
| Framework | Next.js 16 App Router | Same |
| ORM | Prisma 6 | Same |
| Database | SQLite (`prisma/dev.db`) | PostgreSQL via Supabase |
| Auth | Single `ADMIN_PASSWORD` env var + httpOnly cookie | Supabase Auth (role-based) |
| Email | Resend SDK (`RESEND_API_KEY`) | Same |
| Styling | Tailwind CSS v3 + custom brand tokens | Same |
| Hosting | Local dev only | Vercel + Supabase |

---

## Database Models

```
Member         — player profiles, guardian info, team, status
Payment        — fee payments linked to a member
Notification   — email send log
Registration   — public form submissions (pending/approved/rejected)
```

**Production additions needed:**
- `Session` — practice/game sessions
- `Attendance` — per-player attendance per session
- Real `User` model with roles (admin, coach, parent)

---

## Route Architecture

```
/                          Public landing page
/register                  Public registration form
/login                     Staff login (single password)
/dashboard                 Protected overview
/members                   Protected member list
/members/new               Add member
/members/[id]              Member detail + email
/members/[id]/edit         Edit member
/finances                  Finance overview
/finances/new              Record payment
/registrations             Review form submissions
```

Auth middleware at `middleware.ts`: redirects unauthenticated users to `/login` for all dashboard routes.

---

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=1234
RESEND_API_KEY=                  # Leave empty for console.log fallback
```

---

## Running the Demo

```bash
npm run demo    # prisma db push + seed + next dev
npm run dev     # just next dev (if DB is already set up)
```

Seed creates 30 members across 6 teams (U12/U14/U16 × Basketball/Volleyball), 12 demo payments, and **34 demo registrations** (mix of PENDING/APPROVED/REJECTED for demo purposes).

---

## What's NOT in v1 (Out of Scope)

- Online payments (Stripe, etc.)
- Attendance tracking (data model exists, UI not built)
- Mobile app
- Live game scoring
- Parent-facing login portal
- CSV/PDF export
- Push notifications / SMS

---

## Production Migration Checklist

When rebuilding for real:

1. **Database:** Swap `DATABASE_URL` to Supabase PostgreSQL connection string. Run `prisma migrate deploy`.
2. **Auth:** Replace single-password auth with Supabase Auth. Add `User` model with roles. Update middleware to check Supabase session.
3. **Email sender:** Update `FROM` address in `lib/email.ts` from `onboarding@resend.dev` to a verified domain (e.g. `noreply@413youthclub.com`).
4. **Photos:** Add `/public/hero.jpg` and `/public/coach-ben.jpg` (from Instagram). Update `app/page.tsx` — comment placeholders mark exactly where to drop them.
5. **Attendance UI:** Build session logging + attendance marking (models are already in schema, just need pages and API routes).
6. **Registration → Member:** Already implemented in demo — approval auto-creates a `Member`. No action needed.
7. **Deploy:** Push to Vercel. Set all env vars in Vercel dashboard.
