# Course System Migration Instructions

## Step 1: Install Dependencies

```bash
npm install
```

This will install `tsx` which is needed to run the seed script.

## Step 2: Run Prisma Migration

```bash
npx prisma migrate dev --name add_course_system
```

This will:
- Create the `Course` and `TutorCourse` models in your database
- Add the relationship between users and courses
- Generate updated Prisma client

## Step 3: Seed Northwestern Courses

```bash
npm run db:seed
```

This will populate the database with all Northwestern courses from the CSV file.

## Step 4: Verify in Database

You can check that everything worked by running:

```bash
npx prisma studio
```

Then navigate to:
- `Course` table - should have ~3700+ Northwestern courses
- `TutorCourse` table - will be empty until tutors add courses to their profiles
- `User` table - should have the new `tutoredCourses` relation

## What Changed

### Database Schema
- Added `Course` model with `courseId`, `courseName`, and `school` fields
- Added `TutorCourse` junction table for many-to-many relationship between users and courses
- Users can now have multiple courses they tutor

### Backend (tRPC)
- `getAllApprovedTutors`: Now accepts `selectedCourses` filter
- `updateTutor`: Now accepts `courseIds` array to update tutor's courses
- New queries:
  - `getCoursesBySchool`: Get all courses for a specific school
  - `getSchoolsWithCourses`: Get list of schools that have courses
  - `getTutorCourses`: Get all courses a tutor teaches
  - `addTutorCourses`: Add/update courses for a tutor

### Frontend (To be updated next)
- Tutor onboarding will show course selector for Northwestern tutors
- Tutors page will have course filter for Northwestern
- Landing page course search will work with database data

## Troubleshooting

If migration fails:
1. Check your DATABASE_URL in .env
2. Make sure you have network access to Supabase
3. Try running `npx prisma generate` first
4. Check Supabase dashboard for any connection issues

