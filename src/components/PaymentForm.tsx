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
import { getCurrentTimezone, convertTimeBetweenTimezones } from '~/utils/timezones';

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
      const timeInTutorTimezone = convertTimeBetweenTimezones(
        time,
        studentTimezone,
        tutorTimezone
      );
      result = await bookSession.mutateAsync({
        tutorId,
        date,
        time: timeInTutorTimezone,
        paymentIntentId: paymentIntent.id,
        studentName,
        studentEmail,
      });
      if ((result as any)?.conflicted) {
        toast.error('This time slot was just booked by someone else. Please choose another.');
        return;
      }
      bookingId = (result as any).bookingId ?? (result as any).id;
    } else {
      // Free session - create booking directly
      result = await createBooking.mutateAsync({
        tutorId,
        date,
        time,
        status: "confirmed",
      });
      bookingId = result.id;
    }

    // Get tutor info for emails (since createBooking doesn't return it)
    const tutorInfo = tutor.data ? {
      tutorName: `${tutor.data.firstName} ${tutor.data.lastName}`,
      tutorEmail: tutor.data.email,
      meetingLink: tutor.data.meetingLink,
      timezone: tutor.data.timezone,
    } : null;

    // Send emails if we have tutor info
    if (tutorInfo) {
      // Get student's timezone (we need to import getCurrentTimezone)
      const studentTimezone = getCurrentTimezone();
      
      // Calculate end time (start time + 1 hour) for student timezone
      const studentStartTimeDate = new Date(`2000-01-01 ${time}`);
      const studentEndTimeDate = new Date(studentStartTimeDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      const studentEndTime = studentEndTimeDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Convert times to tutor's timezone
      const tutorStartTime = convertTimeBetweenTimezones(
        time,
        studentTimezone,
        tutorInfo.timezone ?? 'PST'
      );
      const tutorStartTimeDate = new Date(`2000-01-01 ${tutorStartTime}`);
      const tutorEndTimeDate = new Date(tutorStartTimeDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      const tutorEndTime = tutorEndTimeDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Email params for tutor (in tutor's timezone)
      const tutorEmailParams = {
        tutor_name: tutorInfo.tutorName,
        student_name: studentName,
        date,
        start_time: tutorStartTime,
        end_time: tutorEndTime,
        timeZone: tutorInfo.timezone ?? 'PST',
        student_email: studentEmail,
        tutor_email: tutorInfo.tutorEmail,
        location: tutorInfo.meetingLink ?? 'N/A',
      };

      // Email params for student (in student's timezone)
      const studentEmailParams = {
        tutor_name: tutorInfo.tutorName,
        student_name: studentName,
        date,
        start_time: time,
        end_time: studentEndTime,
        timeZone: studentTimezone,
        student_email: studentEmail,
        tutor_email: tutorInfo.tutorEmail,
        location: tutorInfo.meetingLink ?? 'N/A',
      };

      console.log('Sending emails with params:');
      console.log('Tutor email params:', tutorEmailParams);
      console.log('Student email params:', studentEmailParams);

      // Send email to tutor
      try {
        await emailjs.send("service_z8zzszl", "template_z7etjno", tutorEmailParams, {
          publicKey: "To4xMN8D9pz4wwmq8",
        });
        console.log('Email sent to tutor successfully');
      } catch (error) {
        console.error('Error sending email to tutor:', error);
      }

      // Send email to student
      try {
        await emailjs.send("service_z8zzszl", "template_gvkyabt", studentEmailParams, {
          publicKey: "To4xMN8D9pz4wwmq8",
        });
        console.log('Email sent to student successfully');
      } catch (error) {
        console.error('Error sending email to student:', error);
      }
    }

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