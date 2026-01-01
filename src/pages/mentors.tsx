import Head from "next/head";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";

export default function MentorsLandingPage() {
  const { openSignUp } = useClerk();
  const { isSignedIn } = useUser();

  return (
    <>
      <Head>
        <title>Become a Mentor - Pathway</title>
        <meta
          name="description"
          content="Get paid for what you just accomplished. Turn your recent experience into paid 1:1 calls — no tutoring required."
        />
      </Head>

      <div className="relative min-h-screen">
        {/* Match the smooth blended background used on the landing + onboarding pages */}
        <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-violet-100/30 via-white/70 to-purple-100/30 backdrop-blur-3xl" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <section className="grid gap-16 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-sm font-medium text-violet-600 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                For mentors
              </div>

              <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Get paid for your achievements.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-600">
                Students want to learn from people who are currently doing what they aspire to do. Pathway lets you turn your experience into real income.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Choose your own rate", detail: "Charge what your time is worth." },
                  { title: "Choose your own hours", detail: "We understand you are busy." },
                  { title: "Help the younger you", detail: "Make success accessible to everyone." },
                  { title: "Share your story", detail: "Students want to hear what you have to say." },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-lg backdrop-blur"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                {!isSignedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openSignUp()}
                      className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                    >
                      Get started
                    </button>
                  </>
                ) : (
                  <Link
                    href="/tutor-onboarding"
                    className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
                  >
                    Set up your mentor profile
                  </Link>
                )}

                <Link
                  href="/tutors"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  I&apos;m looking for a mentor
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-violet-300/30 blur-3xl" />
              <div className="absolute -right-8 bottom-24 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
              <div className="relative rounded-[2.5rem] border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur">
                <p className="text-sm font-semibold text-slate-800">What you can get booked for</p>
                <div className="mt-6 space-y-3 text-sm text-slate-700">
                  {[
                    "Got into a top university",
                    "Interned at a top company",
                    "Aced a difficult class at your school",
                  ].map((example) => (
                    <div
                      key={example}
                      className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
                    >
                      &ldquo;{example}&rdquo;
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-white to-purple-50 p-5 text-sm text-slate-600">
                  You already have the experience someone else wants to learn from.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}



