import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

type AvailabilityEntry = {
  id: string;
  day: string;
  available: boolean;
  timeRange: string | null;
};

type TutorBookingEntry = {
  id: string;
  date: string;
  time: string;
  status: string;
};

type RescheduleContext = {
  bookingId: string;
  tutorId: string;
  tutorName: string;
  studentName: string;
  studentEmail?: string | null;
  originalDate: string;
  originalTime: string;
  tutorTimezone: string;
  availability: AvailabilityEntry[];
  bookings: TutorBookingEntry[];
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: RescheduleContext | { bookingId: string };
};

function parse12HourTimeToMinutes(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hours = Number.parseInt(match[1] ?? '0', 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  const period = (match[3] ?? 'AM').toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  let hour24 = hours % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + minutes;
}

function formatMinutesTo12Hour(totalMinutes: number): string {
  const minutesNormalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hours24 = Math.floor(minutesNormalized / 60);
  const minutes = minutesNormalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  if (hours24 === 0) hours24 = 12;
  if (hours24 > 12) hours24 -= 12;
  return `${hours24}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export default function StudentReschedulePage() {
  const router = useRouter();
  const tokenParam = router.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [context, setContext] = useState<RescheduleContext | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
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
        const response = await fetch(`/api/booking-actions?action=student-reschedule-context&token=${encodeURIComponent(currentToken)}`);
        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.success || !data.data) {
          throw new Error(data.error ?? 'Invalid reschedule link.');
        }

        if (!cancelled) {
          setContext(data.data as RescheduleContext);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Invalid reschedule link.';
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

  const availableDateOptions = useMemo(() => {
    if (!context) return [] as string[];

    const availableDays = new Set(
      context.availability.filter((entry) => entry.available).map((entry) => entry.day),
    );

    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (availableDays.has(dayName)) {
        dates.push(toDateKey(date));
      }
    }

    return dates;
  }, [context]);

  const timeSlots = useMemo(() => {
    if (!context || !selectedDate) return [] as string[];

    const date = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return [];

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = context.availability.filter(
      (entry) => entry.day === dayName && entry.available && entry.timeRange,
    );

    const slotSet = new Set<string>();

    for (const entry of dayAvailability) {
      const rawRange = entry.timeRange ?? '';
      const [start, end] = rawRange.replace(/[–—]/g, '-').split(/\s*-\s*/);
      if (!start || !end) continue;

      const startMinutes = parse12HourTimeToMinutes(start);
      const endMinutes = parse12HourTimeToMinutes(end);
      if (startMinutes == null || endMinutes == null) continue;

      for (let cursor = startMinutes; cursor < endMinutes; cursor += 60) {
        slotSet.add(formatMinutesTo12Hour(cursor));
      }
    }

    const bookedForDate = new Set(
      context.bookings
        .filter((entry) => {
          const entryDate = new Date(entry.date).toISOString().split('T')[0] ?? '';
          return entryDate === selectedDate;
        })
        .map((entry) => entry.time),
    );

    const slots = Array.from(slotSet)
      .filter((time) => !bookedForDate.has(time))
      .sort((a, b) => {
        const aMinutes = parse12HourTimeToMinutes(a) ?? 0;
        const bMinutes = parse12HourTimeToMinutes(b) ?? 0;
        return aMinutes - bMinutes;
      });

    return slots;
  }, [context, selectedDate]);

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  const handleSubmit = async () => {
    if (!token || !selectedDate || !selectedTime) return;

    const confirmed = window.confirm(
      `Confirm reschedule to ${selectedDate} at ${selectedTime}?`,
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/booking-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'student-reschedule',
          token,
          date: selectedDate,
          time: selectedTime,
          studentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Unable to reschedule this session.');
      }

      setDoneMessage('Session rescheduled successfully. Updated confirmation emails have been sent.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reschedule this session.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reschedule Session - Pathway Tutors</title>
      </Head>

      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold text-gray-900">Reschedule Session</h1>

          {loading && <p className="mt-4 text-gray-600">Loading reschedule options...</p>}

          {!loading && error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
          )}

          {!loading && !error && context && !doneMessage && (
            <>
              <p className="mt-4 text-gray-700">
                Your session with <strong>{context.tutorName}</strong> was cancelled by the tutor. Choose a new time below.
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Original session</p>
                <p className="font-medium text-gray-900">{context.originalDate} at {context.originalTime}</p>
              </div>

              <div className="mt-6">
                <label htmlFor="reschedule-date" className="block text-sm font-medium text-gray-700">
                  New Date
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  min={availableDateOptions[0]}
                  max={availableDateOptions[availableDateOptions.length - 1]}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Times are shown in tutor timezone ({context.tutorTimezone}).
                </p>
              </div>

              <div className="mt-4">
                <label htmlFor="reschedule-time" className="block text-sm font-medium text-gray-700">
                  New Time
                </label>
                <select
                  id="reschedule-time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  disabled={!selectedDate}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">
                    {!selectedDate ? 'Select a date first' : timeSlots.length > 0 ? 'Choose a time' : 'No available times'}
                  </option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedDate || !selectedTime || submitting}
                className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
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
