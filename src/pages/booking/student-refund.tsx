import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type RefundContext = {
  bookingId: string;
  tutorName: string;
  studentName: string;
  date: string;
  time: string;
  timeZone: string;
  amountCents: number;
  isFreeSession: boolean;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: RefundContext | { refunded: boolean; refundId: string | null };
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StudentRefundPage() {
  const router = useRouter();
  const tokenParam = router.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [context, setContext] = useState<RefundContext | null>(null);
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
        const response = await fetch(`/api/booking-actions?action=student-refund-context&token=${encodeURIComponent(currentToken)}`);
        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.success || !data.data) {
          throw new Error(data.error ?? 'Invalid refund link.');
        }

        if (!cancelled) {
          setContext(data.data as RefundContext);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Invalid refund link.';
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

  const handleRefund = async () => {
    if (!token || !context) return;

    const confirmed = window.confirm(
      context.isFreeSession
        ? 'Confirm closing this cancelled free session?'
        : `Confirm refund of ${formatAmount(context.amountCents)}?`,
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
          action: 'student-refund',
          token,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Refund failed.');
      }

      const refundResult = data.data as { refunded: boolean; refundId: string | null };
      if (context.isFreeSession) {
        setDoneMessage('This cancelled free session has been closed.');
      } else {
        setDoneMessage(
          refundResult.refunded
            ? `Refund submitted successfully${refundResult.refundId ? ` (ID: ${refundResult.refundId})` : ''}.`
            : 'Refund submitted.',
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Refund failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Refund Session - Pathway Tutors</title>
      </Head>

      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold text-gray-900">Refund Request</h1>

          {loading && <p className="mt-4 text-gray-600">Loading refund details...</p>}

          {!loading && error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
          )}

          {!loading && !error && context && !doneMessage && (
            <>
              <p className="mt-4 text-gray-700">
                Session with <strong>{context.tutorName}</strong> on {context.date} at {context.time} ({context.timeZone}).
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {context.isFreeSession ? 'No charge (free session)' : formatAmount(context.amountCents)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefund}
                disabled={submitting}
                className="mt-6 w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? 'Processing...'
                  : context.isFreeSession
                    ? 'Confirm Cancellation'
                    : 'Request Refund'}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                You will be asked to confirm before this action is final.
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
