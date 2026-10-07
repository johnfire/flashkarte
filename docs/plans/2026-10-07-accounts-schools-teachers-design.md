# Accounts: schools, teachers, students

Status: **draft — not approved.** Records what Chris decided in chat on
2026-10-07. Sections marked **OPEN** need his answer before building.

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

### Schools come in by CSV

The school sends a CSV listing teachers, the classes each teaches, and the
students in each class. That one import creates the school, its teacher and
student accounts, the classes and their memberships. Billing is computed from
the head count.

### Leaving

- A teacher leaving a school is offered their own teacher subscription.
  - **Takes it:** all their decks stay; they control who sees them. Shares to
    the old school end, because they are no longer in it.
  - **Declines:** their decks are **frozen** — hidden from everyone, nothing
    deleted — for 6 months. Returning within 6 months unfreezes them. After 6
    months they are deleted.

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
- `classes` — id, teacher_id, school_id (nullable for independent
  teachers), name (e.g. "Biologie 7B").
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

## OPEN — needs Chris

1. **Price gap.** A subscriber pays €5. A teacher pays €3 and gets at least
   as much, plus classroom features. A student in an independent teacher's
   class pays €1 for unlimited. Anyone can call themselves a teacher and make
   a class of one. Is that acceptable, or do teachers need verifying, or does
   the €3 teacher plan *not* include unlimited personal use?
2. **Students without email.** Many school students — especially minors —
   have no email address. Should CSV-imported students log in with a username
   and a one-time password the teacher hands out?
3. **Independent teachers' classes.** No CSV for them. Proposal: the teacher
   creates a class in the app and gets a join code to give students. Agree?
4. **What the school keeps.** When a teacher leaves, the school's students
   lose that teacher's decks mid-term. Is that intended, or should the school
   keep a copy? (Who legally owns decks made by a teacher during employment
   is a question for a lawyer, not for me.)
5. **Leaving a school as a student.** Does the student drop to free (10
   units) or individual, and what happens to their own decks?
6. **Data protection.** Not legal advice, and outside my reliable domain;
   flagging what I'm fairly confident of:
   - GDPR does not prescribe 6 months. It requires a stated, justified
     retention period (storage limitation, Art. 5(1)(e)) — 6 months is a
     reasonable choice if it is written into the privacy policy.
   - A teacher can demand deletion before the 6 months are up (Art. 17); the
     freeze cannot override that.
   - For school pupils, the school is very likely the controller and
     flashkarte the processor, which means a data processing agreement
     (AVV, Art. 28) with each school. German states may have their own rules
     on software used in schools — I don't know Bavaria's specifics.
   Recommend a data-protection review before the first school signs.

## Build order (once approved)

1. Account kinds + `content_shares` + read-path changes. No billing.
2. Independent teachers: classes, join codes, student seats, Stripe.
3. Schools: CSV import, school decks, invoicing.
4. Leaving and freezing: offer flow, freeze, purge job.

Each phase ships on its own and leaves the app working if the next one
never comes.
