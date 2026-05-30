import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import { getCurrentTimezone, convertAppointmentBetweenTimezones } from '~/utils/timezones';
import { useUser } from '@clerk/nextjs';

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  tutorId: string;
  userId: string;
  date: string;
  time: string;
  amount: number; // amount in cents
  studentName: string;
  studentEmail: string;
  onSuccess: (bookingId: string) => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<PaymentFormProps> = ({ 
  tutorId, 
  userId,
  date, 
  time, 
  amount, 
  studentName,
  studentEmail,
  onSuccess, 
  onCancel 
}) => {
  const { user } = useUser();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const createPaymentIntent = api.post.createPaymentIntent.useMutation();
  const bookSession = api.post.bookSession.useMutation();
  const createBooking = api.post.createBooking.useMutation();
  const tutor = api.post.getSingleTutor.useQuery(userId)

  const handleSuccess = async (paymentIntent?: { id: any; }) => {
    // Book the session
    let result;
    let bookingId: string;
    
    if (paymentIntent) {
      // Paid session - create booking (with tutor timezone to prevent duplicates)
      const tutorTimezone = tutor.data?.timezone ?? 'PST';
      const studentTimezone = getCurrentTimezone();
      const tutorSlot = convertAppointmentBetweenTimezones(
        date,
        time,
        studentTimezone,
        tutorTimezone
      );
      result = await bookSession.mutateAsync({
        tutorId,
        studentClerkId: user?.id,
        date: tutorSlot.date,
        time: tutorSlot.time,
        paymentIntentId: paymentIntent.id,
        studentName,
        studentEmail,
      });
      if ('conflicted' in result && result.conflicted) {
        toast.error('This time slot was just booked by someone else. Please choose another.');
        return;
      }
      // At this point, TypeScript knows result is the success type
      if ('bookingId' in result) {
        bookingId = result.bookingId;
      } else {
        // This should never happen, but handle gracefully
        toast.error('Unexpected response format from booking');
        return;
      }
    } else {
      // Free session - create booking directly
      result = await createBooking.mutateAsync({
        tutorId,
        date,
        time,
        status: "confirmed",
      });
      if ('conflicted' in result && result.conflicted) {
        toast.error('This time slot was just booked by someone else. Please choose another.');
        return;
      }
      // At this point, TypeScript knows result is the success type
      if ('id' in result) {
        bookingId = result.id;
      } else {
        // This should never happen, but handle gracefully
        toast.error('Unexpected response format from booking');
        return;
      }
    }

    // Paid-session scheduling + confirmation emails are handled server-side in bookSession.

    toast.success('Session booked successfully!');
    onSuccess(bookingId);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Check if this is a free first session
      const isFreeSession = tutor.data?.firstSessionFree;
      
      if (isFreeSession) {
        // Free session - bypass payment
        await handleSuccess();
      } else {
        // Paid session - process payment
        // Create payment intent
        const { clientSecret } = await createPaymentIntent.mutateAsync({
          tutorId,
          date,
          time,
          amount,
          studentName,
          studentEmail,
        });

        if (!clientSecret) {
          throw new Error('Failed to create payment intent');
        }

        // Confirm the payment
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        });

        if (error) {
          toast.error(error.message ?? 'Payment failed');
          return;
        }

        if (paymentIntent?.status === 'succeeded') {
          await handleSuccess(paymentIntent);
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Student: {studentName}
          </p>
          <p className="text-sm text-gray-600">
            Email: {studentEmail}
          </p>
          <p className="text-sm text-gray-600">
            Amount: ${(amount / 100).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Date: {new Date(date).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600">
            Time: {time}
          </p>
        </div>
        
        <div className="border border-gray-300 rounded-md p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};

export default PaymentForm; 
