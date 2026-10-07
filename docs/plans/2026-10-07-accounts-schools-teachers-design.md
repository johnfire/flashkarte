# Accounts: schools, teachers, students

Status: **draft — not approved.** Records what Chris decided in chat on
2026-10-07 (two rounds). Sections marked **OPEN** need his answer before
building.

## Problem

Today an account is either free (10 active units), paid (€5/month or
€50/year), admin-gifted, or admin. Sharing is one boolean, `is_public`, on
decks, legacy courses and subjects. Chris wants to sell to schools and
teachers, which needs three new kinds of account, groups (schools and
classes), sharing narrower than "everyone", and per-seat billing.

In this document "deck" means any content unit: deck, legacy course,
structured course (subject). The rules apply to all of them.

## Decisions (from Chris)

### Account kinds — one per login, never more than one

| Kind | Who | Pays |
|---|---|---|
| Admin | Runs the app | — |
| Subscriber | Individual, paid or gifted | €5/month (existing) |
| Free | Individual | €0, 10 active units |
| School | A school's administrator login | €3/teacher + €1/student per month, invoiced |
| Teacher | In a school, or independent | School pays, or €3/month themselves |
| Student | In a school, in a teacher's class, or both | School pays; or teacher or student pays €1/month; or free (10 units) |

### Who sees what

Everyone sees app (official) decks and public decks.

| Creator | Can share with |
|---|---|
| School | Its own teachers and students only |
| Teacher | Nobody (private) · their students · their school · everyone |
| Student | Nobody (private) · their classmates · everyone |
| Subscriber / Free | Nobody (private) · everyone (existing behaviour) |

A student sees: app decks, public decks, their school's decks, decks their
teachers shared with students, decks classmates shared with the class, and
their own.

### The free limit

Decks assigned by a teacher **count** toward a free student's 10. School
members are never free: a school buys seats for **all** its teachers and
students or it does not buy at all, so every school member is unlimited.

Consequence: the free student exists only in an independent teacher's class.

### Nobody self-declares as teacher or student

- **Teachers must prove they are teachers.** A school listing someone as its
  teacher is proof. An independent teacher proves it some other way (see
  OPEN 1).
- **A student exists only because a school or teacher listed them.** There is
  no "sign up as a student" button.

This closes the price gap (€3 teacher vs €5 subscriber, €1 student): nobody
can buy the cheaper plans by calling themselves a teacher or student. The
cheaper rates are worth it because they bring volume — a school of 10
teachers × 10 students is €30 + €100 per month; Chris's own estimate is
higher. *(Arithmetic note: 100 students × €1 = €100, not €300; €300 would
need 30 students per teacher. Worth checking which figure the business case
assumes.)*

### How students get on the list

- **Schools:** CSV listing teachers, the classes each teaches, and the
  students in each class. One import creates the school, its teacher and
  student accounts, the classes and their memberships. Billing is computed
  from the head count. School pupils log in with a **username and a one-time
  password** the teacher hands out — no email needed.
- **Independent teachers:** send a list of each student's email address.
  The student signs up with exactly that address and is placed in the class.
  An address not on a list cannot become a student.

### Terms (school periods)

Classes run for a **term** with an end date: a semester, nine weeks, or any
other length. Each class belongs to a term; the term is stored, not assumed.

### Leaving

- **A teacher leaving a school mid-term keeps their classes and decks until
  the term ends.** Students lose nothing mid-term. Only at the term's end does
  the rest of this list apply.
- A teacher leaving a school is offered their own teacher subscription.
  - **Takes it:** all their decks stay; they control who sees them. Shares to
    the old school end, because they are no longer in it.
  - **Declines:** their decks are **frozen** — hidden from everyone, nothing
    deleted — for 6 months. Returning within 6 months unfreezes them. After 6
    months they are deleted.
  - A teacher can demand deletion at any time; that overrides the freeze.
- Six months is the retention period, written into the privacy policy.

## Proposed design

### Naming: "class", not "course"

The school's CSV calls a teacher's group of students a "course". The app
already uses "course" twice (legacy deck collections and structured
courses). The school-side group is called a **class** everywhere in code and
UI. The CSV column header can still say "course"; the importer maps it.

### Account kind vs. entitlement — two separate fields

"Free" and "Subscriber" are the same kind of account (an individual) with a
different entitlement. Students are the same: one kind, free or paid. So:

- `users.account_kind`: `individual | school | teacher | student`
  (`admin` stays as today's `account_type = 'admin'` / auth path).
- **Entitlement** (unlimited or 10-unit) is *computed*, not stored, from any
  one of: own subscription, admin gift, signup promo, school membership, or a
  student seat paid by a teacher. This extends the existing
  `hasUnlimitedAccess` in `billing.service.ts` instead of adding a parallel
  system.

Why: if entitlement were a stored label, every payment source would have to
keep the label in sync, and the first missed webhook leaves someone wrongly
locked out. Computing it from its sources means one failed source affects
only itself.

### New tables (additive — no existing column is removed)

- `schools` — id, name, billing contact, status (`active | frozen`),
  invoice cadence.
- `users.school_id` — nullable; set for school logins, school teachers and
  school students.
- `terms` — id, owner (school or independent teacher), name (e.g.
  "Winter semester 2026/27", "Q1"), starts_on, ends_on. Any length.
- `classes` — id, teacher_id, school_id (nullable for independent
  teachers), term_id, name (e.g. "Biologie 7B").
- `class_invitations` — class_id, email. An independent teacher's list;
  matched at signup, then turned into a `class_members` row.
- `users.username` — nullable; required for school pupils without email.
  `users.email` becomes nullable for them only. Usernames are unique within a
  school, and pupils log in with school code + username.
- `teacher_verifications` — user_id, method (`school_roster | manual`),
  verified_by, verified_at.
- `class_members` — class_id, student_id. A student may be in many classes,
  across one school and independent teachers.
- `student_seats` — student_id, paid_by (`teacher | student`),
  billing_subscription_id. Records who pays the €1.
- `content_shares` — content_type, content_id, scope (`class | school |
  teacher_students`), scope_id. `is_public` keeps meaning "everyone"; this
  table adds the narrower audiences. Existing public/private behaviour is
  untouched.

Every content read path today filters on `user_id = $1 OR is_public OR
official`. Each gets one more `OR EXISTS (content_shares … matching the
viewer's school/classes)`. The same pattern the official-decks change used.

### Freezing

A daily job checks term end dates: a teacher who left mid-term has their
school shares ended, and the subscription offer sent, when the term ends.
`users.frozen_at` plus a daily purge job (same shape as the audit-retention
job) that deletes accounts frozen for more than 6 months. Frozen content is
excluded from every read path. If the purge job fails, nothing else is
affected; it retries next day.

### CSV import

Validate the whole file first and report **every** error at once (row and
reason). Import only if the file is clean, in one transaction. A partial
import would bill the school for an incomplete roster, so all-or-nothing is
the safer choice here.

### Billing

- Schools: invoiced (Stripe Invoicing, per-seat quantities), monthly or
  quarterly — cadence stored per school.
- Independent teacher: Stripe subscription, €3/month.
- Student seat paid by a teacher: one Stripe subscription on the teacher with
  quantity = paid students. Paid by the student: their own €1 subscription.
- Seat purchases for others are web-only. Google Play billing is for the
  buyer's own account; buying seats for other people through Play is not
  something it does well.

## Resolved in round 2

- Price gap → teachers are verified; students exist only via a list.
- Pupils without email → username + one-time password.
- Independent teachers' classes → teacher sends a list of student emails.
- School losing a leaving teacher's decks → not mid-term; access runs to
  term end.
- Data protection → 6-month retention; deletion on demand honoured; a data
  processing agreement (AVV) with every school; a data-protection review
  before the first school signs. Bavarian school-software rules: later, not
  now.

## OPEN — needs Chris

1. **How does an independent teacher prove they are a teacher?** Upload a
   document (teacher ID, employment letter) and an admin approves by hand?
   That means storing a sensitive document — or the admin views it and it is
   deleted after the decision.
2. **A student leaving a school or class.** Do they become a free individual
   (10 units) with their own decks kept? Or is their account frozen like a
   teacher's? School pupils with only a username have no email to log in with
   afterwards.
3. **Who sets term dates?** Proposal: schools give them in the CSV (or a
   settings page); independent teachers set an end date when creating a
   class.
4. **The €300 figure** — see the arithmetic note above.

## Build order (once approved)

1. Account kinds + `content_shares` + read-path changes. No billing.
2. Independent teachers: verification, terms, classes, email invitation
   lists, student seats, Stripe.
3. Schools: CSV import, username logins, school decks, invoicing.
4. Leaving and freezing: term-end handover, offer flow, freeze, purge job.

Each phase ships on its own and leaves the app working if the next one
never comes.
