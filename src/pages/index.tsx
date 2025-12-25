import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import NewNav from "~/components/NewNav";
import majors from "~/majors";
import schools from "~/schools";
import { api } from "~/utils/api";

const FEATURED_SCHOOLS = [
  { name: "UCLA", logo: "/ucla.png" },
  { name: "UC Berkeley", logo: "/berkeley.png" },
  { name: "Northwestern", logo: "/northwestern.png" },
  { name: "Brown", logo: "/brown.png" },
];

const DIFFERENTIATORS = [
  {
    title: "Dream school mentors",
    description:
      "Every tutor currently attends the universities you aspire to. Learn from insiders who already earned admission.",
  },
  {
    title: "Course specific search",
    description:
      "Filter by major, class, or focus area and connect with mentors who already aced the exact syllabus you’re tackling.",
  },
  {
    title: "Vetted & ready to teach",
    description:
      "Free first session to help you decide if the mentor is right for you.",
  },
];

const TESTIMONIALS = [
  {
    name: "Layne, admitted to Northwestern",
    quote:
      "My mentor walked me through the exact essay that got them in and personalized my essay to my background.",
  },
  {
    name: "Vincent, Northwestern freshman",
    quote:
      "Pathway helped me find a tutor who already took CompEng 203 and helped me get an A!",
  },
  {
    name: "Tony, 8th grade student",
    quote:
      "My mentor helped me in math and now I am on track to take AP Calculus BC as a freshman in high school.",
  },
];

const ROLES = [
  { id: "aspiring", label: "College applicant" },
  { id: "enrolled", label: "Course search" },
];

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("aspiring");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [majorQuery, setMajorQuery] = useState("");
  const [courseQuery, setCourseQuery] = useState("");

  const trimmedSchoolOptions = useMemo(() => schools.slice(0, 150), []);
  const trimmedMajorOptions = useMemo(() => majors.slice(0, 150), []);
  const approvedTutors = api.post.getAllApprovedTutors.useQuery({});
  
  // Get top 3 tutors by paid bookings count
  const topTutors = useMemo(() => {
    if (!approvedTutors.data) return [];
    return [...approvedTutors.data]
      .sort((a, b) => (b.bookings?.length ?? 0) - (a.bookings?.length ?? 0))
      .slice(0, 3);
  }, [approvedTutors.data]);
  
  // Load Northwestern courses from database - only when Northwestern is selected
  const northwesternCoursesQuery = api.post.getCoursesBySchool.useQuery(
    { school: "Northwestern University" },
    { enabled: role === "enrolled" && schoolQuery === "Northwestern University" }
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (schoolQuery.trim()) {
      params.set("school", schoolQuery.trim());
    }
    if (role === "aspiring" && majorQuery.trim()) {
      params.set("major", majorQuery.trim());
    }
    if (role === "enrolled" && courseQuery.trim()) {
      params.set("course", courseQuery.trim());
    }
    if (role) {
      params.set("role", role);
    }
    const queryString = params.toString();
    void router.push(queryString ? `/tutors?${queryString}` : "/tutors");
  };

  return (
    <>
      <Head>
        <title>Pathway</title>
        <meta
          name="description"
          content="Match with verified peer mentors from top universities by school, major, or course. Pathway makes it effortless to find the tutor who already thrives where you want to go."
        />
        <link rel="icon" href="/ourlogo720.png" />
        
        {/* Open Graph / iMessage preview metadata */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.pathwaytutors.com" />
        <meta property="og:title" content="Pathway" />
        <meta property="og:description" content="Match with verified peer mentors from top universities by school, major, or course. Pathway makes it effortless to find the tutor who already thrives where you want to go." />
        <meta property="og:image" content="https://www.pathwaytutors.com/og-image.png" />
        <meta property="og:image:secure_url" content="https://www.pathwaytutors.com/og-image.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Pathway" />
        <meta property="og:site_name" content="Pathway" />
        <meta property="og:locale" content="en_US" />
        
        {/* Fallback image link for better crawler compatibility */}
        <link rel="image_src" href="https://www.pathwaytutors.com/og-image.png" />
        
        {/* Prevent crawlers from using page images instead of og-image */}
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        
        {/* Twitter Card metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pathway" />
        <meta name="twitter:description" content="Match with verified peer mentors from top universities by school, major, or course." />
        <meta name="twitter:image" content="https://www.pathwaytutors.com/og-image.png" />
        <meta name="twitter:image:alt" content="Pathway" />
        
        {/* Additional meta tags for better compatibility */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#7c3aed" />
      </Head>
      <div className="relative min-h-screen">
        <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            <section className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-medium text-violet-600 shadow-sm backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  Tutors from the campuses you care about
                </div>
                <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Your dream school. Your major. Your mentor.
                </h1>
                <p className="mt-6 max-w-xl text-lg text-slate-600">
                  Pathway connects ambitious high school students and current college learners with verified tutors already thriving in the exact programs, majors, and courses you care about.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mt-10 rounded-3xl border-2 border-violet-200/60 bg-white/85 p-6 shadow-2xl backdrop-blur ring-1 ring-violet-100/50"
                >
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setRole(option.id)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          role === option.id
                            ? "bg-violet-500 text-white shadow"
                            : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {role === "enrolled" && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                      <span className="font-semibold">Note:</span> Course search is currently only available for Northwestern University students.
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr,1.2fr,0.8fr]">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-600">Target school</span>
                      <input
                        list="school-options"
                        value={schoolQuery}
                        onChange={(event) => setSchoolQuery(event.target.value)}
                        placeholder="Northwestern University"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                      />
                    </label>

                    {role === "aspiring" ? (
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-600">Target major</span>
                        <input
                          list="major-options"
                          value={majorQuery}
                          onChange={(event) => setMajorQuery(event.target.value)}
                          placeholder="Computer Science"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                        />
                      </label>
                    ) : schoolQuery === "Northwestern University" ? (
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-600">Course search</span>
                        <input
                          list="course-options"
                          value={courseQuery}
                          onChange={(event) => setCourseQuery(event.target.value)}
                          placeholder="CS 211 or Fundamentals"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-600">Course search</span>
                        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-500">
                          Select Northwestern University to search courses
                        </div>
                      </div>
                    )}

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-base font-semibold text-white shadow-xl transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                      >
                        Start matching
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span>Or</span>
                    <Link
                      href="/tutors"
                      className="rounded-full bg-violet-100 px-5 py-2.5 text-base font-semibold text-violet-700 transition hover:bg-violet-200 hover:shadow-sm"
                    >
                      Browse every tutor →
                    </Link>
                    <span aria-hidden="true" className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">No credit card. First session can be free.</span>
                  </div>
                </form>

                <datalist id="school-options">
                  {trimmedSchoolOptions.map((schoolName) => (
                    <option key={schoolName} value={schoolName} />
                  ))}
                </datalist>
                <datalist id="major-options">
                  {trimmedMajorOptions.map((majorName) => (
                    <option key={majorName} value={majorName} />
                  ))}
                </datalist>
                <datalist id="course-options">
                  {(northwesternCoursesQuery.data ?? []).map((course) => (
                    <option key={course.id} value={`${course.courseId} - ${course.courseName}`} />
                  ))}
                </datalist>
              </div>

              <div className="relative">
                <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-violet-300/30 blur-3xl" />
                <div className="absolute -right-8 bottom-24 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
                <div className="relative rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Our most popular tutors</span>
                      <Link
                        href="/tutors"
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                      >
                        See all
                      </Link>
                    </div>
                    <div className="space-y-5">
                      {topTutors.map((mentor, index) => {
                        const fullName = `${mentor.firstName ?? ""} ${mentor.lastName ?? ""}`.trim();
                        const price =
                          typeof mentor.hourlyRate === "number"
                            ? `$${mentor.hourlyRate}/hr`
                            : "Rate TBD";
                        const badge =
                          Array.isArray(mentor.subjects) && mentor.subjects.length > 0
                            ? mentor.subjects[0] ?? ""
                            : mentor.major ?? mentor.school ?? "Mentor";
                        const rank = index + 1;
                        const bookingsCount = mentor.bookings?.length ?? 0;
                        return (
                          <div
                            key={mentor.id}
                            className="relative flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-bold text-white shadow-md">
                              {rank}
                            </div>
                            <div className="flex flex-1 items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                                <p className="text-xs text-slate-500">
                                  {mentor.school ?? "School"} • {mentor.major ?? "Major"}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                                    {badge}
                                  </span>
                                  {bookingsCount > 0 && (
                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                      {bookingsCount} session{bookingsCount !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{price}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-white to-purple-50 p-5 text-sm text-slate-600">
                      Pathway&apos;s matching engine surfaces mentors by course, availability, and budget so you only see relevant fits.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-24">
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Trusted by students heading to
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
                {FEATURED_SCHOOLS.map((school) => (
                  <div
                    key={school.name}
                    className="flex items-center justify-center rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <Image
                      src={school.logo}
                      alt={school.name}
                      width={120}
                      height={40}
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-28 grid gap-12 md:grid-cols-3">
              {DIFFERENTIATORS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border-2 border-violet-200/50 bg-white/65 p-8 shadow-lg backdrop-blur ring-1 ring-violet-100/40 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="text-2xl">✨</div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-base text-slate-600">{item.description}</p>
                </div>
              ))}
            </section>

            <section className="mt-28 grid gap-16 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div className="rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white/90 to-purple-100/50 p-10 shadow-xl backdrop-blur">
                <h2 className="text-3xl font-semibold text-slate-900">Designed for both sides of the journey</h2>
                <div className="mt-8 space-y-6 text-slate-600">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">High school dreamers</h3>
                    <p>
                      Work directly with current students from your target school to review essays, plan coursework, and
                      build confidence before you submit.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Current college students</h3>
                    <p>
                      Unlock upperclassmen who crushed the exact exams and labs you&apos;re preparing for. Every mentor
                      shares notes, study frameworks, and proven tactics.
                    </p>
                  </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/tutors"
                    className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                  >
                    Explore tutors
                  </Link>
                  <Link
                    href="/tutor-onboarding"
                    className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    Become a mentor
                  </Link>
                </div>
              </div>
              <div className="space-y-6">
                {TESTIMONIALS.map((testimonial) => (
                  <div
                    key={testimonial.name}
                    className="rounded-3xl border border-white/80 bg-white/75 p-6 text-slate-700 shadow-lg backdrop-blur"
                  >
                    <p className="text-base">&ldquo;{testimonial.quote}&rdquo;</p>
                    <p className="mt-4 text-sm font-semibold text-slate-500">{testimonial.name}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-28 rounded-[2.75rem] border border-violet-200/60 bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-500 px-10 py-14 text-white shadow-2xl">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-semibold">Let&apos;s find your campus insider</h2>
                  <p className="mt-4 text-base text-violet-100">
                    Share your goal, and Pathway will surface mentors who already made it there. Keep every discovery in
                    one place, book on your timeline, and get coached by people living your dream.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/tutors"
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  >
                    Start searching tutors
                  </Link>
                  <Link
                    href="/tutor-onboarding"
                    className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    List yourself as a tutor
                  </Link>
                </div>
              </div>
            </section>
        </main>

        <footer className="border-t border-white/60 bg-white/70 py-8 text-center text-sm text-slate-500 backdrop-blur">
          &copy; {new Date().getFullYear()} Pathway. All rights reserved.
        </footer>
      </div>
    </>
  );
}
