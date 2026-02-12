import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/router";

import majors from "~/majors";
import schools from "~/schools";
import { api } from "~/utils/api";
import PortalMultiselect from "~/components/PortalMultiselect";

const FEATURED_SCHOOLS = [
  { name: "Harvard", logo: "/harvard.png" },
  { name: "Caltech", logo: "/caltech.png" },
  { name: "Cornell", logo: "/cornell.png" },
  { name: "UPenn", logo: "/upenn.png" },
  { name: "Brown", logo: "/brown.png" },
  { name: "Berkeley", logo: "/berkeley.png" },
  { name: "UCLA", logo: "/ucla.png" },
  { name: "Duke", logo: "/duke.png" },
  { name: "Northwestern", logo: "/northwestern.png" },

];


const DIFFERENTIATORS = [
  {
    title: "Recent experience triumphs old experience",
    description:
      "Today's systems are not the same as they were years ago. Learn from people who are doing what you're trying to do.",
  },
  {
    title: "Find the perfect mentor for your goals",
    description:
      "Filter by school, company, or major and find the mentor with the keys to your goals.",
  },
  {
    title: "Get real results",
    description:
      "Ask what you need, follow their footsteps, and be where you want to be.",
  },
];

const TESTIMONIALS = [
  {
    name: "“Interned at Google last summer”",
    quote:
      "I found someone who had just done the exact recruiting process. They reviewed my resume, told me what mattered, and helped me prep the interview.",
  },
  {
    name: "“Transferred into a top private university”",
    quote:
      "My mentor explained the strategy, timeline, and what they’d do differently. It saved me weeks of guessing.",
  },
  {
    name: "“Aced this exact class with this professor”",
    quote:
      "They showed me how to study for the exams, what to focus on, and how to avoid the traps that tank grades.",
  },
];

const PATHS = [
  { id: "admissions", label: "College admissions" },
  { id: "internship", label: "Internship / career" },
  { id: "course", label: "Course search" },
] as const;

export default function Home() {
  const router = useRouter();
  const [path, setPath] = useState<(typeof PATHS)[number]["id"]>("admissions");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [majorQuery, setMajorQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [internshipOnly, setInternshipOnly] = useState(true);
  const [transferOnly, setTransferOnly] = useState(false);
  const [courseQuery, setCourseQuery] = useState("");

  const trimmedSchoolOptions = useMemo(() => schools.slice(0, 150), []);
  const companiesQuery = api.post.getAllCompanies.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
  });
  // company options are fetched via tRPC for the PortalMultiselect (no local trimming needed)
  
  // Load Northwestern courses from database - only when Northwestern is selected
  const northwesternCoursesQuery = api.post.getCoursesBySchool.useQuery(
    { school: "Northwestern University" },
    { enabled: path === "course" && schoolQuery === "Northwestern University" }
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const cleanedSchool = schoolQuery.trim();
    const cleanedMajor = majorQuery.trim();
    const cleanedCompany = companyQuery.trim();
    const cleanedCourse = courseQuery.trim();

    if (cleanedSchool) {
      params.set("school", cleanedSchool);
    }

    if (path === "course") {
      if (cleanedCourse) params.set("course", cleanedCourse);
    }
    if (path === "admissions") {
      if (cleanedMajor) params.set("major", cleanedMajor);
      if (transferOnly) params.set("transfer", "1");
    }
    if (path === "internship") {
      if (cleanedCompany) params.set("company", cleanedCompany);
      params.set("internship", internshipOnly ? "1" : "0");
    }

    params.set("path", path);
    const queryString = params.toString();
    void router.push(queryString ? `/tutors?${queryString}` : "/tutors");
  };

  return (
    <>
      <Head>
        <title>Pathway</title>
        <meta
          name="description"
          content="Pathway helps you find and book a call with someone who just did what you’re trying to do — internships, transfers, tough classes, or admissions."
        />
        <link rel="icon" href="/ourlogo720.png" />
        
        {/* Open Graph / iMessage preview metadata */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.pathwaytutors.com" />
        <meta property="og:title" content="Pathway" />
        <meta property="og:description" content="Pathway helps you find and book a call with someone who just did what you’re trying to do — internships, transfers, tough classes, or admissions." />
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
        <meta name="twitter:description" content="Find and book a call with someone who just did what you’re trying to do." />
        <meta name="twitter:image" content="https://www.pathwaytutors.com/og-image.png" />
        <meta name="twitter:image:alt" content="Pathway" />
        
        {/* Additional meta tags for better compatibility */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#7c3aed" />
      </Head>
      <div className="relative min-h-screen">
        <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-20">
              {/* Copy (mobile: above search, desktop: left column). */}
              <div className="order-1 lg:order-1 lg:col-start-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-medium text-violet-600 shadow-sm backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  Real experience. Real results.
                </div>
                <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Follow Their Footsteps.
                </h1>
                <p className="mt-6 max-w-xl text-lg text-slate-600">
                  Your dream is already being lived by someone else. Pathway connects you with mentors who recently achieved the exact outcomes you&apos;re striving for. Learn from people who get you.
                </p>
              </div>

              {/* Search (mobile: below copy, desktop: right column). */}
              <div className="relative order-2 lg:order-2 lg:col-start-2 lg:row-span-2">
                <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-violet-300/30 blur-3xl" />
                <div className="absolute -right-8 bottom-24 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
                <div className="relative rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Search for a mentor
                      </span>
                      <Link
                        href="/tutors"
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                      >
                        Browse all →
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {PATHS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setPath(option.id);
                            setMajorQuery("");
                            setCompanyQuery("");
                            setCourseQuery("");
                          }}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            path === option.id
                              ? "bg-violet-600 text-white shadow"
                              : "bg-violet-100 text-violet-700 hover:bg-violet-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-600">School (optional)</span>
                        <input
                          list="school-options"
                          value={schoolQuery}
                          onChange={(event) => setSchoolQuery(event.target.value)}
                          placeholder="Northwestern University"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
                        />
                      </label>

                      {path === "admissions" && (
                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <span className="font-medium">Transfer</span>
                          <input
                            type="checkbox"
                            checked={transferOnly}
                            onChange={(e) => setTransferOnly(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                        </label>
                      )}

                      {path === "course" ? (
                        schoolQuery === "Northwestern University" ? (
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-slate-600">Course (Northwestern)</span>
                            <div className="rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                              <PortalMultiselect
                                placeholder="Search Northwestern courses"
                                selectedValues={courseQuery ? [courseQuery] : []}
                                options={(northwesternCoursesQuery.data ?? []).map(
                                  (c) => `${c.courseId} - ${c.courseName}`,
                                )}
                                maxSelected={1}
                                onChange={(items) => setCourseQuery(items[0] ?? "")}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Course search is currently only available for Northwestern University.
                          </div>
                        )
                      ) : path === "admissions" ? (
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-slate-600">
                            Target major / program
                          </span>
                          <div className="rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                            <PortalMultiselect
                              placeholder="Search majors (e.g., Computer Science)"
                              selectedValues={majorQuery ? [majorQuery] : []}
                              options={majors}
                              maxSelected={1}
                              onChange={(items) => setMajorQuery(items[0] ?? "")}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-slate-600">Company</span>
                            <div className="rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                              <PortalMultiselect
                                placeholder="Search companies (e.g., Google)"
                                selectedValues={companyQuery ? [companyQuery] : []}
                                options={companiesQuery.data ?? []}
                                maxSelected={1}
                                onChange={(items) => setCompanyQuery(items[0] ?? "")}
                              />
                            </div>
                          </div>
                          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            <span className="font-medium">Internship</span>
                            <input
                              type="checkbox"
                              checked={internshipOnly}
                              onChange={(e) => setInternshipOnly(e.target.checked)}
                              className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-base font-semibold text-white shadow-xl transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                    >
                      Search
                    </button>

                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-white to-purple-50 p-5 text-sm text-slate-600">
                      Your upperclassman on speed dial. Book a call. Get the playbook.
                    </div>
                  </form>
                </div>
              </div>

              {/* Examples + CTAs (mobile: below search, desktop: left column below copy). */}
              <div className="order-3 lg:order-3 lg:col-start-1">
                <div className="mt-1 space-y-4">
                  <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-lg backdrop-blur">
                    <p className="text-sm font-semibold text-slate-700">Examples</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        "Accepted into your dream CS program",
                        "Interned at Google last summer",
                        "Got an A in that exact class last semester",
                        "Transferred into a T10 university",
                      ].map((example) => (
                        <div
                          key={example}
                          className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm"
                        >
                          &ldquo;{example}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/tutors"
                      className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                    >
                      Find a mentor
                    </Link>
                    <Link
                      href="/mentors"
                      className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      Become a mentor
                    </Link>
                  </div>
                </div>

                <datalist id="school-options">
                  {trimmedSchoolOptions.map((schoolName) => (
                    <option key={schoolName} value={schoolName} />
                  ))}
                </datalist>
                {/* majors + course options are rendered via PortalMultiselect */}
                {/* company options are rendered via PortalMultiselect */}
              </div>
            </section>

            <section className="mt-24">
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Trusted by students heading to
              </h2>
              <div className="relative mt-8 overflow-hidden">
                {/* Fade edges */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#f5f3ff] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#f5f3ff] to-transparent" />
                {/* Marquee track */}
                <div className="flex w-max animate-marquee">
                  {[...FEATURED_SCHOOLS, ...FEATURED_SCHOOLS].map((school, i) => (
                    <div
                      key={`${school.name}-${i}`}
                      className="mx-6 flex flex-shrink-0 items-center justify-center rounded-2xl bg-white/70 px-8 py-4 shadow-sm backdrop-blur-sm"
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
                <h2 className="text-3xl font-semibold text-slate-900">A search engine for those looking for:</h2>
                <div className="mt-8 space-y-6 text-slate-600">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">College admissions</h3>
                    <p>
                      Talk to students who attend the programs you want.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Internships</h3>
                    <p>
                      Find mentors who recently recruited into the roles you want.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Course help</h3>
                    <p>
                      Get an upperclassman who aced the exact class you&apos;re taking.
                    </p>
                  </div>
                </div>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/tutors"
                    className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                  >
                    Find a mentor
                  </Link>
                  <Link
                    href="/mentors"
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
                    Filter to find the perfect mentor for your goals.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/tutors"
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                  >
                    Start searching mentors
                  </Link>
                  <Link
                    href="/mentors"
                    className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Become a mentor
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
