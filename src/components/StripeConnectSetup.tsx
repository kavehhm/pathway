import React, { useState } from 'react';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import { useUser } from '@clerk/nextjs';

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

  const handleContinueOnboarding = () => {
    if (tutor.data?.stripeAccountId) {
      // Get the account link to continue onboarding
      window.location.href = `https://dashboard.stripe.com/express/${tutor.data.stripeAccountId}`;
    }
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
          <div className="text-sm text-gray-500">
            <p>Platform fee: 20%</p>
            <p>You receive: 80% of each session</p>
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
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>Platform fee: 20%</p>
            <p>You receive: 80% of each session</p>
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
        This allows you to receive 80% of each session payment directly to your bank account.
      </p>
      
      <button
        onClick={handleSetup}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Setting up...' : 'Setup Payment Account'}
      </button>
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        <p>Platform fee: 20%</p>
        <p>You receive: 80% of each session</p>
      </div>
    </div>
  );
};

export default StripeConnectSetup; 