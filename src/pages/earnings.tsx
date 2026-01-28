import { useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import EarningsDashboard from '~/components/EarningsDashboard';
import { api } from '~/utils/api';

export default function EarningsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // Get tutor data to verify they are a tutor
  const { data: tutor, isLoading: tutorLoading } = api.post.getTutor.useQuery(
    user?.id ?? '',
    { enabled: !!user?.id }
  );

  // Redirect non-authenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (tutorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If user is not a tutor or hasn't completed their profile
  if (!tutor) {
    return (
      <>
        <Head>
          <title>Earnings - Pathway Tutors</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-violet-100/30 via-white/70 to-purple-100/30">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Complete Your Profile First</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                To access your earnings dashboard, please complete your tutor profile setup.
              </p>
              <Link
                href="/tutor-onboarding"
                className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-xl font-medium transition-colors"
              >
                Complete Profile Setup
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Earnings - Pathway Tutors</title>
        <meta name="description" content="View and withdraw your tutoring earnings" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-violet-100/30 via-white/70 to-purple-100/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
                <p className="text-gray-600 mt-1">Manage your tutoring income and withdrawals</p>
              </div>
              <Link
                href="/tutor-onboarding"
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Profile
              </Link>
            </div>
          </div>

          {/* Dashboard */}
          <EarningsDashboard />
        </div>
      </div>
    </>
  );
}
