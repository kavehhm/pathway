import React, { useEffect, useState } from 'react';
import { api } from '~/utils/api';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';

interface EarningsDashboardProps {
  onWithdrawComplete?: () => void;
}

const EarningsDashboard: React.FC<EarningsDashboardProps> = ({ onWithdrawComplete }) => {
  const { user } = useUser();
  const router = useRouter();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Get wallet data
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = 
    api.post.getMentorWallet.useQuery(user?.id ?? '', {
      enabled: !!user?.id,
    });

  // Get Stripe status
  const { data: stripeStatus, refetch: refetchStripeStatus } = 
    api.post.getMentorStripeStatus.useQuery(user?.id ?? '', {
      enabled: !!user?.id,
    });

  // Get payout history
  const { data: payoutHistory, refetch: refetchPayouts } = 
    api.post.getPayoutHistory.useQuery(user?.id ?? '', {
      enabled: !!user?.id,
    });

  // Mutations
  const withdrawMutation = api.post.withdrawEarnings.useMutation({
    onSuccess: (data) => {
      setIsWithdrawing(false);
      if (data.requiresOnboarding && 'onboardingUrl' in data && data.onboardingUrl) {
        toast.success('Redirecting to complete verification...');
        window.location.href = data.onboardingUrl;
      } else {
        toast.success(data.message ?? 'Withdrawal successful!');
        refetchWallet();
        refetchPayouts();
        onWithdrawComplete?.();
      }
    },
    onError: (error) => {
      setIsWithdrawing(false);
      toast.error(error.message ?? 'Failed to process withdrawal');
    },
  });

  const processPendingMutation = api.post.processPendingPayout.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? 'Transfer processed!');
      refetchWallet();
      refetchPayouts();
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to process payout');
    },
  });

  const getOnboardingLinkMutation = api.post.getStripeOnboardingLink.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to get onboarding link');
    },
  });

  // Handle URL params for onboarding completion
  useEffect(() => {
    const { onboarding, payoutId, refresh } = router.query;
    
    if (onboarding === 'complete') {
      toast.success('Stripe verification updated!');
      refetchStripeStatus();
      refetchWallet();
      
      if (payoutId && typeof payoutId === 'string') {
        // Try to process the pending payout
        processPendingMutation.mutate({
          payoutId,
          mentorClerkId: user?.id ?? '',
        });
      }
      
      // Clean up URL
      router.replace('/earnings', undefined, { shallow: true });
    }
    
    if (refresh === 'true') {
      refetchStripeStatus();
      router.replace('/earnings', undefined, { shallow: true });
    }
  }, [router.query, user?.id]);

  const handleWithdraw = (amount?: number) => {
    if (!user?.id) return;
    
    setIsWithdrawing(true);
    withdrawMutation.mutate({
      mentorClerkId: user.id,
      amountCents: amount,
    });
  };

  const handleCustomWithdraw = () => {
    const amountDollars = parseFloat(customAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    handleWithdraw(Math.round(amountDollars * 100));
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      INITIATED: 'bg-yellow-100 text-yellow-800',
      REQUIRES_ONBOARDING: 'bg-orange-100 text-orange-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return styles[status] ?? 'bg-gray-100 text-gray-800';
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading earnings...</span>
      </div>
    );
  }

  const wallet = walletData?.wallet;
  const pendingPayouts = walletData?.pendingPayouts ?? [];
  const ledgerEntries = walletData?.ledgerEntries ?? [];

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Available Balance</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(wallet?.availableCents ?? 0)}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-green-100 text-sm">Ready to withdraw</p>
        </div>

        {/* Pending Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(wallet?.pendingCents ?? 0)}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-yellow-100 text-sm">Awaiting verification or processing</p>
        </div>

        {/* Stripe Status */}
        <div className={`rounded-2xl p-6 text-white shadow-lg ${
          stripeStatus?.payoutsEnabled 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
            : 'bg-gradient-to-br from-gray-500 to-gray-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Payout Status</p>
              <p className="text-xl font-bold mt-1">
                {stripeStatus?.payoutsEnabled ? 'Ready' : 'Setup Required'}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              {stripeStatus?.payoutsEnabled ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
          </div>
          {!stripeStatus?.payoutsEnabled && (
            <button
              onClick={() => user?.id && getOnboardingLinkMutation.mutate(user.id)}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Complete Verification
            </button>
          )}
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Funds</h3>
        
        {(wallet?.availableCents ?? 0) > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleWithdraw()}
                disabled={isWithdrawing}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 px-6 rounded-xl font-medium transition-colors"
              >
                {isWithdrawing ? 'Processing...' : `Withdraw All (${formatCurrency(wallet?.availableCents ?? 0)})`}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">or</span>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max={(wallet?.availableCents ?? 0) / 100}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleCustomWithdraw}
                disabled={isWithdrawing || !customAmount}
                className="bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
              >
                Withdraw
              </button>
            </div>
            
            <p className="text-sm text-gray-500">
              {!stripeStatus?.payoutsEnabled 
                ? "You'll need to complete Stripe verification before receiving funds."
                : "Funds typically arrive in 2-3 business days."}
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <p className="text-gray-600">No funds available to withdraw</p>
            <p className="text-sm text-gray-500 mt-1">Complete sessions to earn money</p>
          </div>
        )}
      </div>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Withdrawals</h3>
          <div className="space-y-3">
            {pendingPayouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{formatCurrency(payout.amountCents)}</p>
                  <p className="text-sm text-gray-500">{formatDate(payout.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(payout.status)}`}>
                    {payout.status.replace('_', ' ')}
                  </span>
                  {payout.status === 'REQUIRES_ONBOARDING' && (
                    <button
                      onClick={() => user?.id && processPendingMutation.mutate({
                        payoutId: payout.id,
                        mentorClerkId: user.id,
                      })}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Complete & Process
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {ledgerEntries.length > 0 ? (
          <div className="space-y-3">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    entry.amountCents >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {entry.amountCents >= 0 ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{entry.description ?? entry.type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
                <p className={`font-semibold ${entry.amountCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.amountCents >= 0 ? '+' : ''}{formatCurrency(entry.amountCents)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No activity yet</p>
          </div>
        )}
      </div>

      {/* Payout History */}
      {payoutHistory && payoutHistory.length > 0 && (
        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.map((payout) => (
                  <tr key={payout.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-900">{formatDate(payout.createdAt)}</td>
                    <td className="py-3 font-medium text-gray-900">{formatCurrency(payout.amountCents)}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(payout.status)}`}>
                        {payout.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-900">How payouts work</h4>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>1. Complete tutoring sessions with students</li>
              <li>2. Sessions are marked complete and earnings are added to your balance</li>
              <li>3. Click &quot;Withdraw&quot; to transfer funds to your bank account</li>
              <li>4. First withdrawal requires Stripe verification (SSN, bank info)</li>
              <li>5. Funds typically arrive in 2-3 business days</li>
            </ul>
            <p className="mt-3 text-sm text-blue-700">
              <strong>Platform fee:</strong> 10% | <strong>You receive:</strong> 90% of each session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboard;
