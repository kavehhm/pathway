import React, { useEffect, useState } from 'react';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';
import type { TRPCClientErrorLike } from '@trpc/react-query';
import type { AppRouter } from '~/server/api/root';
import Link from 'next/link';

interface StripeConnectSetupProps {
  onSuccess?: () => void;
}

const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({ onSuccess }) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  // Get tutor data to check current Stripe account status
  const tutor = api.post.getTutor.useQuery(user?.id ?? "", {
    enabled: !!user?.id,
  });

  // Add getStripeAccountStatus tRPC query (manual trigger)
  const {
    data: stripeStatusData,
    isLoading: isStatusLoading,
    error: statusErrorObj,
    refetch: refetchStripeStatus,
  } = api.post.getStripeAccountStatus.useQuery(user?.id ?? '', {
    enabled: !!user?.id && !!tutor.data?.stripeAccountId,
    refetchOnWindowFocus: false,
  });
  const statusError = statusErrorObj ? statusErrorObj.message : null;

  // On mount, check Stripe status if user has a Stripe account
  useEffect(() => {
    if (user?.id && tutor.data?.stripeAccountId) {
      refetchStripeStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tutor.data?.stripeAccountId]);

  // Function to refresh tutor data and Stripe status
  const refreshTutorDataAndStatus = () => {
    if (user?.id && tutor.data?.stripeAccountId) {
      refetchStripeStatus().then(() => tutor.refetch());
    } else {
      tutor.refetch();
    }
  };

  const createAccount = api.post.createStripeConnectAccount.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.accountLink) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.accountLink;
      }
      toast.success('Payment account setup initiated');
      onSuccess?.();
    },
    onError: (error) => {
      setIsLoading(false);
      toast.error(error.message || 'Failed to setup payment account');
    },
  });

  // Function to refresh tutor data
  const refreshTutorData = () => {
    tutor.refetch();
  };

  const handleSetup = () => {
    if (!user) {
      toast.error('Please log in to setup your payment account');
      return;
    }

    setIsLoading(true);
    createAccount.mutate({
      tutorId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
  };

  const continueOnboarding = api.post.createStripeConnectAccount.useMutation({
    onSuccess: (data) => {
      if (data.accountLink) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.accountLink;
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to continue onboarding');
    },
  });

  const handleContinueOnboarding = () => {
    if (!user) {
      toast.error('Please log in to continue onboarding');
      return;
    }

    continueOnboarding.mutate({
      tutorId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
  };

  // Show loading state
  if (tutor.isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading payment status...</p>
      </div>
    );
  }

  // Show different content based on account status
  const accountStatus = tutor.data?.stripeAccountStatus;
  const hasAccount = !!tutor.data?.stripeAccountId;

  if (hasAccount && accountStatus === 'active') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Payment Account Ready
          </h2>
          <p className="text-gray-600 mb-6">
            Your payment account is active and ready to receive payments from students.
          </p>
          <Link
            href={`https://connect.stripe.com/app/express#${tutor.data?.stripeAccountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-block bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors mb-6"
          >
            Access Payment Portal
          </Link>
          <div className="text-sm text-gray-500 ">
            <p>Platform fee: 10%</p>
            <p>You receive: 90% of each session</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasAccount && accountStatus === 'pending') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Account Verification Pending
          </h2>
          <p className="text-gray-600 mb-6">
            Your payment account is being verified. You can continue the verification process or restart the setup.
          </p>

          {/* Yellow warning box with SSN reminder */}
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-left">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">
                  Account Not Yet Approved?
                </p>
                <p className="text-sm text-yellow-700">
                  If your account verification is taking longer than expected, you may need to complete additional information in your Stripe account. 
                  <strong> A common issue is forgetting to add your SSN (Social Security Number) for tax purposes.</strong>
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  Click &quot;Continue Verification&quot; below to review and complete any missing information.
                </p>
              </div>
            </div>
          </div>

          {isStatusLoading && (
            <div className="flex items-center justify-center mb-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-600">Checking Stripe status...</span>
            </div>
          )}
          {statusError && (
            <div className="text-red-600 text-sm mb-2">{statusError}</div>
          )}
          <div className="space-y-3">
            <button
              onClick={handleContinueOnboarding}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Continue Verification
            </button>
            <button
              onClick={handleSetup}
              disabled={isLoading}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-md font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Redo Setup'}
            </button>
            <button
              onClick={refreshTutorDataAndStatus}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              disabled={isStatusLoading}
            >
              {isStatusLoading ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>Platform fee: 10%</p>
            <p>You receive: 90% of each session</p>
          </div>
        </div>
      </div>
    );
  }

  // Default: No account set up yet
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Setup Payment Account
      </h2>
      <p className="text-gray-600 mb-6 text-center">
        To receive payments from students, you need to setup your Stripe Connect account.
        This allows you to receive 90% of each session payment directly to your bank account.
      </p>
      
      <button
        onClick={handleSetup}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Setting up...' : 'Setup Payment Account'}
      </button>
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        <p>Platform fee: 10%</p>
        <p>You receive: 90% of each session</p>
      </div>
    </div>
  );
};

export default StripeConnectSetup; 