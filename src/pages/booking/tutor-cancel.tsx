import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type TutorCancelContext = {
  bookingId: string;
  tutorName: string;
  studentName: string;
  date: string;
  time: string;
  timezone: string;
  status: string;
  studentEmail?: string | null;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: TutorCancelContext | { studentEmailSent: boolean };
};

export default function TutorCancelBookingPage() {
  const router = useRouter();
  const tokenParam = router.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [context, setContext] = useState<TutorCancelContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const currentToken = token;

    let cancelled = false;

    async function fetchContext() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/booking-actions?action=tutor-cancel-context&token=${encodeURIComponent(currentToken)}`);
        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.success || !data.data) {
          throw new Error(data.error ?? 'Invalid cancellation link.');
        }

        if (!cancelled) {
          setContext(data.data as TutorCancelContext);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Invalid cancellation link.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchContext();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleCancelSession = async () => {
    if (!token || !context) return;

    const confirmed = window.confirm(
      `Confirm cancellation? This will notify ${context.studentName} and offer reschedule/refund options.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/booking-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tutor-cancel',
          token,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to cancel this booking.');
      }

      const actionResult = data.data as { studentEmailSent: boolean };
      setDoneMessage(
        actionResult.studentEmailSent
          ? 'Session cancelled. The student has been emailed with reschedule and refund links.'
          : 'Session cancelled. Student notification email could not be sent automatically.',
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel this booking.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Tutor Cancellation - Pathway Tutors</title>
      </Head>

      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold text-gray-900">Cancel Session</h1>

          {loading && <p className="mt-4 text-gray-600">Loading session details...</p>}

          {!loading && error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
          )}

          {!loading && !error && context && !doneMessage && (
            <>
              <p className="mt-4 text-gray-700">
                You are about to cancel this session with <strong>{context.studentName}</strong>.
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{context.date}</p>

                <p className="mt-3 text-sm text-gray-500">Time</p>
                <p className="font-medium text-gray-900">{context.time} ({context.timezone})</p>
              </div>

              <button
                type="button"
                onClick={handleCancelSession}
                disabled={submitting}
                className="mt-6 w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Cancelling...' : 'Cancel Session'}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                You will be asked to confirm before cancellation is final.
              </p>
            </>
          )}

          {doneMessage && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-green-800">
              {doneMessage}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
