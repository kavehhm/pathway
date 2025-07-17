import Head from "next/head";
import Link from "next/link";
import Hero from "~/components/Hero";
import NewNav from "~/components/NewNav";

const TOP_SCHOOLS = [
  { file: "/berkeley.png", alt: "UC Berkeley", name: "UC Berkeley" },
  { file: "/brown.png", alt: "Brown", name: "Brown" },
  { file: "/ucla.png", alt: "UCLA", name: "UCLA" },
  { file: "/northwestern.png", alt: "Northwestern", name: "Northwestern" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Pathway | College Tutoring, Simplified</title>
        <meta name="description" content="Get the best college tutoring help, when you need it, where you need it. Find top tutors, book sessions, and succeed in your courses." />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-32">
        {/* Removed duplicate Navigation */}

        {/* Hero Section */}
        <section className="py-24 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Unlock Your Academic Potential
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-1 max-w-2xl mx-auto">
            Connect with top college tutors, get help in any subject, and achieve your goals. Pathway makes finding and booking expert tutors easy, fast, and affordable.
          </p>
        </section>

        {/* Find a Tutor Button below Hero Section */}
        <div className="flex justify-center mb-1">
          <Link href="/tutors" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow transition">Find a Tutor</Link>
        </div>

        {/* Top Schools Logos */}
        <section className="max-w-5xl mx-auto py-10 px-4">
          <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">Our tutors come from top universities:</h3>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {TOP_SCHOOLS.map((school) => (
              <img
                key={school.name}
                src={school.file}
                alt={school.alt}
                title={school.name}
                className="h-20 w-auto transition" // Increased height, removed grayscale
              />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-5xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center text-indigo-800 mb-10">How Pathway Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
              <div className="bg-indigo-100 p-4 rounded-full mb-4">
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Search</h3>
              <p className="text-gray-600 text-center">Browse top-rated tutors by subject, school, or expertise. Find the perfect match for your needs.</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
              <div className="bg-purple-100 p-4 rounded-full mb-4">
                {/* Weekly Availability calendar/clock icon */}
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Book</h3>
              <p className="text-gray-600 text-center">Schedule a session instantly. Choose a time that works for you—online or in-person.</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
              <div className="bg-green-100 p-4 rounded-full mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Succeed</h3>
              <p className="text-gray-600 text-center">Meet your tutor, get personalized help, and boost your grades with confidence.</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        {/* Removed 'What Students Say' section */}

        {/* Call to Action */}
        {/* Removed Popular Subjects and Ready to Get Started sections */}

        {/* Footer */}
        <footer className="py-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Pathway. All rights reserved.
        </footer>
      </div>
    </>
  );
}
