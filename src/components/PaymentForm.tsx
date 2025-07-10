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
import emailjs from '@emailjs/browser';

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  tutorId: string;
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
  date, 
  time, 
  amount, 
  studentName,
  studentEmail,
  onSuccess, 
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const createPaymentIntent = api.post.createPaymentIntent.useMutation();
  const bookSession = api.post.bookSession.useMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
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
          // Book the session
          const result = await bookSession.mutateAsync({
            tutorId,
            date,
            time,
            paymentIntentId: paymentIntent.id,
            studentName,
            studentEmail,
          });

          // Send emails if booking was successful and we have tutor info
          if (result.tutorInfo) {
            // Calculate end time (start time + 1 hour)
            const startTimeDate = new Date(`2000-01-01 ${time}`);
            const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000); // Add 1 hour
            const endTime = endTimeDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });

            const formParams = {
              tutor_name: result.tutorInfo.tutorName,
              student_name: studentName,
              start_time: time,
              end_time: endTime,
              timeZone: 'UTC',
              student_email: studentEmail,
              tutor_email: result.tutorInfo.tutorEmail,
              location: result.tutorInfo.meetingLink ?? 'N/A',
            };

            console.log('Sending emails with params:', formParams);

            // Send email to tutor
            try {
              await emailjs.send("service_z8zzszl", "template_z7etjno", formParams, {
                publicKey: "To4xMN8D9pz4wwmq8",
              });
              console.log('Email sent to tutor successfully');
            } catch (error) {
              console.error('Error sending email to tutor:', error);
            }

            // Send email to student
            try {
              await emailjs.send("service_z8zzszl", "template_gvkyabt", formParams, {
                publicKey: "To4xMN8D9pz4wwmq8",
              });
              console.log('Email sent to student successfully');
            } catch (error) {
              console.error('Error sending email to student:', error);
            }
          }

          toast.success('Payment successful! Session booked.');
          onSuccess(result.bookingId);
        }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
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