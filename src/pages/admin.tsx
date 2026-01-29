import { useUser } from '@clerk/nextjs';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { api } from '~/utils/api';

export default function AdminDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // Get admin stats
  const { data: stats, isLoading, error } = api.post.getAdminDashboardStats.useQuery(
    user?.id ?? '',
    { 
      enabled: !!user?.id,
      retry: false,
    }
  );

  // Redirect non-authenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const formatCurrency = (cents: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents ?? 0) / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Access Denied - Pathway</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to view this page.</p>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Admin Dashboard - Pathway</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Pathway</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform financials and statistics</p>
          </div>

          {/* Key Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Safe to Withdraw */}
            <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Safe to Withdraw</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(stats?.safeToWithdraw)}
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-green-100 text-sm">Platform fees (your revenue)</p>
            </div>

            {/* Owed to Mentors */}
            <div className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Owed to Mentors</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(stats?.totalOwedToMentors)}
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-red-100 text-sm">
                Available: {formatCurrency(stats?.totalAvailableToMentors)} | 
                Pending: {formatCurrency(stats?.totalPendingToMentors)}
              </p>
            </div>

            {/* Total Revenue */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(stats?.totalRevenue)}
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-indigo-100 text-sm">All time from paid bookings</p>
            </div>

            {/* Total Bookings */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Total Bookings</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats?.totalBookings ?? 0}
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-amber-100 text-sm">
                Paid: {stats?.paidBookings ?? 0} | Free: {stats?.freeBookings ?? 0}
              </p>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Platform Fees (10%)</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.totalPlatformFees)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Mentor Earnings (90%)</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.totalMentorEarnings)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500">Already Paid to Mentors</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.alreadyPaidToMentors)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.completedPayoutCount ?? 0} completed transfers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mentor Balances */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mentor Balances</h3>
              {stats?.mentorBreakdown && stats.mentorBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {stats.mentorBreakdown.map((mentor) => (
                    <div key={mentor.clerkId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{mentor.name}</p>
                        <p className="text-sm text-gray-500">
                          Available: {formatCurrency(mentor.available)} | 
                          Pending: {formatCurrency(mentor.pending)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(mentor.total)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No mentor balances</p>
              )}
            </div>

            {/* Pending Payouts */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Payouts</h3>
              {stats?.pendingPayouts && stats.pendingPayouts.length > 0 ? (
                <div className="space-y-3">
                  {stats.pendingPayouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payout.mentor.firstName} {payout.mentor.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payout.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(payout.amountCents)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          payout.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          payout.status === 'REQUIRES_ONBOARDING' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payout.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No pending payouts</p>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Paid Bookings</h3>
            {stats?.recentBookings && stats.recentBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Tutor</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium text-right">Platform Fee</th>
                      <th className="pb-3 font-medium text-right">Mentor Earnings</th>
                      <th className="pb-3 font-medium text-center">Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-gray-900">{formatDate(booking.date)}</td>
                        <td className="py-3 text-gray-900">{booking.tutorName}</td>
                        <td className="py-3 text-gray-600">{booking.time}</td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          {formatCurrency(booking.totalAmount)}
                        </td>
                        <td className="py-3 text-right text-green-600">
                          {formatCurrency(booking.platformFee)}
                        </td>
                        <td className="py-3 text-right text-gray-600">
                          {formatCurrency(booking.mentorEarnings)}
                        </td>
                        <td className="py-3 text-center">
                          {booking.earningsProcessed ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent bookings</p>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-200 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Understanding the Numbers</h4>
                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                  <li><strong>Safe to Withdraw:</strong> Your platform fees (10% of each booking) that you can transfer to your bank</li>
                  <li><strong>Owed to Mentors:</strong> Money in mentor wallets waiting to be withdrawn - DO NOT touch this</li>
                  <li><strong>Total Revenue:</strong> All money collected from students for paid sessions</li>
                  <li><strong>Already Paid:</strong> Transfers already sent to mentor bank accounts via Stripe</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
