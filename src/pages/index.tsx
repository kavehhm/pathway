import Head from "next/head";
import Link from "next/link";
import Hero from "~/components/Hero";
import NewNav from "~/components/NewNav";

const TOP_SCHOOLS = [
  { file: "/harvard.png", alt: "Harvard", name: "Harvard" },
  { file: "/mit.png", alt: "MIT", name: "MIT" },
  { file: "/stanford.png", alt: "Stanford", name: "Stanford" },
  { file: "/ucla.png", alt: "UCLA", name: "UCLA" },
  { file: "/nyu.png", alt: "NYU", name: "NYU" },
  { file: "/berkeley.png", alt: "UC Berkeley", name: "UC Berkeley" },
  { file: "/princeton.png", alt: "Princeton", name: "Princeton" },
  { file: "/yale.png", alt: "Yale", name: "Yale" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Pathway | College Tutoring, Simplified</title>
        <meta name="description" content="Get the best college tutoring help, when you need it, where you need it. Find top tutors, book sessions, and succeed in your courses." />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Pathway Logo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-indigo-700">Pathway</span>
            </div>
            <div className="flex gap-6 items-center">
              <Link href="/tutors" className="text-indigo-700 font-semibold hover:underline">Find a Tutor</Link>
              <Link href="/tutor-onboarding" className="text-purple-700 font-semibold hover:underline">Become a Tutor</Link>
              <Link href="/user" className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition">Sign In</Link>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-24 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Unlock Your Academic Potential
          </h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Connect with top college tutors, get help in any subject, and achieve your goals. Pathway makes finding and booking expert tutors easy, fast, and affordable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tutors" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow transition">Find a Tutor</Link>
            <Link href="/tutor-onboarding" className="bg-white border border-indigo-600 text-indigo-700 px-8 py-4 rounded-lg text-lg font-semibold shadow hover:bg-indigo-50 transition">Become a Tutor</Link>
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
                <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3" /></svg>
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

        {/* Featured Subjects */}
        <section className="max-w-6xl mx-auto py-16 px-4">
          <h2 className="text-3xl font-bold text-center text-purple-800 mb-10">Popular Subjects</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['Calculus', 'Statistics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Psychology', 'Writing', 'Engineering'].map((subject) => (
              <span key={subject} className="bg-indigo-100 text-indigo-700 px-5 py-2 rounded-full text-lg font-medium shadow-sm hover:bg-indigo-200 cursor-pointer transition">{subject}</span>
            ))}
          </div>
        </section>

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
                className="h-12 w-auto grayscale hover:grayscale-0 transition"
              />
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-gradient-to-r from-indigo-100 to-purple-100 py-16">
          <h2 className="text-3xl font-bold text-center text-indigo-900 mb-10">What Students Say</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-lg text-gray-700 mb-4">“Pathway helped me ace my finals! The tutors are knowledgeable and really care about your success.”</p>
              <div className="flex items-center gap-3">
                <img src="/ourlogo.png" alt="Student" className="h-10 w-10 rounded-full" />
                <div>
                  <div className="font-semibold text-indigo-700">Alex, UCLA</div>
                  <div className="text-sm text-gray-500">Biology Major</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-lg text-gray-700 mb-4">“I found a tutor for every class I struggled with. Booking is easy and the sessions are super helpful.”</p>
              <div className="flex items-center gap-3">
                <img src="/emit.png" alt="Student" className="h-10 w-10 rounded-full" />
                <div>
                  <div className="font-semibold text-purple-700">Taylor, NYU</div>
                  <div className="text-sm text-gray-500">Economics Major</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-gray-700 mb-8">Join thousands of college students using Pathway to succeed in their courses.</p>
          <Link href="/tutors" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-lg text-lg font-semibold shadow transition">Find Your Tutor</Link>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Pathway. All rights reserved.
        </footer>
      </div>
    </>
  );
}
