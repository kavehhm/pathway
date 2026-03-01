import crypto from 'crypto';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';

import { db } from '~/server/db';
import { sendEmail } from '~/lib/email';
import {
  studentBookingCancelledByTutorEmail,
} from '~/lib/email/templates/bookingCancellation';
import {
  createMeetEvent,
  deleteCalendarEvent,
  formatBookingForCalendar,
  parseBookingDateTime,
  type CalendarEventDetails,
} from '~/lib/googleCalendar';
import { isValidUrl } from '~/lib/validateUrl';
import { calculateEndTime, sendBookingConfirmationEmails } from '~/lib/sendBookingEmails';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-06-30.basil',
});

const TOKEN_TTL_DAYS = 90;

type TokenKind = 'tutor_cancel' | 'student_reschedule' | 'student_refund';

type TokenFieldMap = {
  hashField: 'tutorCancelTokenHash' | 'studentRescheduleTokenHash' | 'studentRefundTokenHash';
  expiresField:
    | 'tutorCancelTokenExpiresAt'
    | 'studentRescheduleTokenExpiresAt'
    | 'studentRefundTokenExpiresAt';
  usedField:
    | 'tutorCancelTokenUsedAt'
    | 'studentRescheduleTokenUsedAt'
    | 'studentRefundTokenUsedAt';
};

const TOKEN_FIELDS: Record<TokenKind, TokenFieldMap> = {
  tutor_cancel: {
    hashField: 'tutorCancelTokenHash',
    expiresField: 'tutorCancelTokenExpiresAt',
    usedField: 'tutorCancelTokenUsedAt',
  },
  student_reschedule: {
    hashField: 'studentRescheduleTokenHash',
    expiresField: 'studentRescheduleTokenExpiresAt',
    usedField: 'studentRescheduleTokenUsedAt',
  },
  student_refund: {
    hashField: 'studentRefundTokenHash',
    expiresField: 'studentRefundTokenExpiresAt',
    usedField: 'studentRefundTokenUsedAt',
  },
};

const bookingActionInclude = {
  tutor: {
    select: {
      clerkId: true,
      email: true,
      firstName: true,
      lastName: true,
      timezone: true,
      meetingLink: true,
      username: true,
      availability: true,
      bookings: {
        select: {
          id: true,
          date: true,
          time: true,
          status: true,
        },
      },
    },
  },
} as const;

type BookingWithActionContext = Prisma.BookingGetPayload<{ include: typeof bookingActionInclude }> | null;

export class BookingActionError extends Error {
  code:
    | 'INVALID_TOKEN'
    | 'EXPIRED_TOKEN'
    | 'TOKEN_ALREADY_USED'
    | 'BOOKING_NOT_FOUND'
    | 'INVALID_STATE'
    | 'SLOT_CONFLICT'
    | 'MISSING_STUDENT_EMAIL'
    | 'REFUND_FAILED';

  constructor(
    code:
      | 'INVALID_TOKEN'
      | 'EXPIRED_TOKEN'
      | 'TOKEN_ALREADY_USED'
      | 'BOOKING_NOT_FOUND'
      | 'INVALID_STATE'
      | 'SLOT_CONFLICT'
      | 'MISSING_STUDENT_EMAIL'
      | 'REFUND_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'BookingActionError';
    this.code = code;
  }
}

function buildTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);
  return expiresAt;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getAppBaseUrl(): string {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function buildActionUrl(path: string, token: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
}

async function getBookingFromToken(kind: TokenKind, token: string): Promise<NonNullable<BookingWithActionContext>> {
  const tokenTrimmed = token.trim();
  if (!tokenTrimmed) {
    throw new BookingActionError('INVALID_TOKEN', 'Missing token.');
  }

  const { hashField, expiresField, usedField } = TOKEN_FIELDS[kind];
  const tokenHash = hashToken(tokenTrimmed);

  const booking = await db.booking.findFirst({
    where: { [hashField]: tokenHash } as Prisma.BookingWhereInput,
    include: bookingActionInclude,
  });

  if (!booking) {
    throw new BookingActionError('INVALID_TOKEN', 'This link is invalid or has already been replaced.');
  }

  const expiresAt = booking[expiresField];
  const usedAt = booking[usedField];

  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    throw new BookingActionError('EXPIRED_TOKEN', 'This link has expired.');
  }

  if (usedAt) {
    throw new BookingActionError('TOKEN_ALREADY_USED', 'This link has already been used.');
  }

  return booking;
}

function buildTutorName(booking: NonNullable<BookingWithActionContext>): string {
  return `${booking.tutor.firstName} ${booking.tutor.lastName}`.trim();
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function parse12HourTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
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

function isTimeInTutorAvailability(
  availability: NonNullable<BookingWithActionContext>['tutor']['availability'],
  bookingDate: Date,
  targetTime: string,
): boolean {
  const targetMinutes = parse12HourTimeToMinutes(targetTime);
  if (targetMinutes == null) return false;

  const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayAvailability = availability.filter(
    (entry) => entry.day === dayName && entry.available && entry.timeRange,
  );

  for (const entry of dayAvailability) {
    const [start, end] = (entry.timeRange ?? '').replace(/[–—]/g, '-').split(/\s*-\s*/);
    if (!start || !end) continue;
    const startMinutes = parse12HourTimeToMinutes(start);
    const endMinutes = parse12HourTimeToMinutes(end);
    if (startMinutes == null || endMinutes == null) continue;

    if (targetMinutes >= startMinutes && targetMinutes < endMinutes) {
      return true;
    }
  }

  return false;
}

export async function issueTutorCancelToken(bookingId: string): Promise<{ cancelUrl: string; expiresAt: Date }> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = buildTokenExpiry();

  await db.booking.update({
    where: { id: bookingId },
    data: {
      tutorCancelTokenHash: tokenHash,
      tutorCancelTokenExpiresAt: expiresAt,
      tutorCancelTokenUsedAt: null,
    },
  });

  return {
    cancelUrl: buildActionUrl('/booking/tutor-cancel', rawToken),
    expiresAt,
  };
}

async function issueStudentActionTokens(bookingId: string): Promise<{ rescheduleUrl: string; refundUrl: string }> {
  const rescheduleRaw = generateRawToken();
  const refundRaw = generateRawToken();
  const expiresAt = buildTokenExpiry();

  await db.booking.update({
    where: { id: bookingId },
    data: {
      studentRescheduleTokenHash: hashToken(rescheduleRaw),
      studentRescheduleTokenExpiresAt: expiresAt,
      studentRescheduleTokenUsedAt: null,
      studentRefundTokenHash: hashToken(refundRaw),
      studentRefundTokenExpiresAt: expiresAt,
      studentRefundTokenUsedAt: null,
    },
  });

  return {
    rescheduleUrl: buildActionUrl('/booking/student-reschedule', rescheduleRaw),
    refundUrl: buildActionUrl('/booking/student-refund', refundRaw),
  };
}

export async function getTutorCancelContext(token: string) {
  const booking = await getBookingFromToken('tutor_cancel', token);

  if (booking.status === 'refunded') {
    throw new BookingActionError('INVALID_STATE', 'This session has already been refunded.');
  }

  return {
    bookingId: booking.id,
    tutorName: buildTutorName(booking),
    studentName: booking.studentName ?? 'Student',
    date: formatDisplayDate(booking.date),
    time: booking.time,
    timezone: booking.tutor.timezone ?? 'PST',
    status: booking.status,
    studentEmail: booking.studentEmail,
  };
}

export async function cancelBookingByTutorToken(token: string): Promise<{ studentEmailSent: boolean }> {
  const booking = await getBookingFromToken('tutor_cancel', token);

  if (booking.status === 'refunded') {
    throw new BookingActionError('INVALID_STATE', 'This session has already been refunded.');
  }

  if (booking.status === 'cancelled_by_tutor') {
    throw new BookingActionError('INVALID_STATE', 'This session has already been cancelled.');
  }

  const now = new Date();

  await db.booking.update({
    where: { id: booking.id },
    data: {
      status: 'cancelled_by_tutor',
      tutorCancelledAt: now,
      tutorCancelTokenUsedAt: now,
    },
  });

  if (booking.calendarEventId) {
    await deleteCalendarEvent(booking.calendarEventId);
  }

  const { rescheduleUrl, refundUrl } = await issueStudentActionTokens(booking.id);

  if (!booking.studentEmail) {
    return { studentEmailSent: false };
  }

  let studentEmailSent = false;

  try {
    const tutorName = buildTutorName(booking);
    const emailTemplate = studentBookingCancelledByTutorEmail({
      studentName: booking.studentName ?? 'Student',
      tutorName,
      date: formatDisplayDate(booking.date),
      startTime: booking.time,
      endTime: calculateEndTime(booking.time),
      timeZone: booking.tutor.timezone ?? 'PST',
      rescheduleUrl,
      refundUrl,
      refundAvailable: !booking.free && !!booking.stripePaymentIntentId,
    });

    const emailResult = await sendEmail({
      to: booking.studentEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    studentEmailSent = emailResult.success;
  } catch (error) {
    console.error('Failed to send tutor cancellation email to student:', error);
  }

  return { studentEmailSent };
}

export async function getStudentRescheduleContext(token: string) {
  const booking = await getBookingFromToken('student_reschedule', token);

  if (booking.status !== 'cancelled_by_tutor') {
    throw new BookingActionError(
      'INVALID_STATE',
      'This booking is no longer waiting for a reschedule. Please check your latest booking emails.',
    );
  }

  return {
    bookingId: booking.id,
    tutorId: booking.tutorId,
    tutorName: buildTutorName(booking),
    studentName: booking.studentName ?? 'Student',
    studentEmail: booking.studentEmail,
    originalDate: formatDisplayDate(booking.date),
    originalTime: booking.time,
    tutorTimezone: booking.tutor.timezone ?? 'PST',
    availability: booking.tutor.availability,
    bookings: booking.tutor.bookings.filter((item) => item.id !== booking.id && item.status !== 'cancelled_by_tutor' && item.status !== 'refunded'),
  };
}

export async function rescheduleBookingByToken(input: {
  token: string;
  date: string;
  time: string;
  studentTimezone?: string;
}): Promise<{ bookingId: string }> {
  const { token, date, time, studentTimezone } = input;
  const booking = await getBookingFromToken('student_reschedule', token);

  if (booking.status !== 'cancelled_by_tutor') {
    throw new BookingActionError(
      'INVALID_STATE',
      'This booking is no longer waiting for a reschedule. Please check your latest booking emails.',
    );
  }

  if (!booking.studentEmail) {
    throw new BookingActionError('MISSING_STUDENT_EMAIL', 'Cannot reschedule because the student email is missing.');
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BookingActionError('INVALID_STATE', 'Invalid reschedule date.');
  }

  const normalizedDate = new Date(parsedDate.toISOString().split('T')[0] ?? date);

  if (!isTimeInTutorAvailability(booking.tutor.availability, normalizedDate, time)) {
    throw new BookingActionError(
      'INVALID_STATE',
      'Selected date/time is outside the tutor availability window.',
    );
  }

  const existing = await db.booking.findFirst({
    where: {
      tutorId: booking.tutorId,
      date: normalizedDate,
      time,
      id: { not: booking.id },
    },
    select: { id: true },
  });

  if (existing) {
    throw new BookingActionError('SLOT_CONFLICT', 'That time slot has already been booked. Please choose another one.');
  }

  const tutorTimezone = booking.tutor.timezone ?? 'America/Los_Angeles';
  const tutorName = buildTutorName(booking);
  const studentName = booking.studentName ?? 'Student';

  let nextMeetLink = booking.tutor.meetingLink ?? booking.meetLink ?? '';
  let nextCalendarEventId: string | null = null;
  let nextCalendarHtmlLink: string | null = null;

  if (booking.calendarEventId) {
    await deleteCalendarEvent(booking.calendarEventId);
  }

  const shouldCreateGoogleMeet = !isValidUrl(booking.tutor.meetingLink);

  if (shouldCreateGoogleMeet) {
    const { startTime, endTime } = parseBookingDateTime(
      normalizedDate.toISOString().split('T')[0] ?? date,
      time,
      tutorTimezone,
    );

    const { summary, description } = formatBookingForCalendar(tutorName, studentName);

    const eventDetails: CalendarEventDetails = {
      summary,
      description,
      startTime,
      endTime,
      timezone: tutorTimezone,
      tutorEmail: booking.tutor.email,
      studentEmail: booking.studentEmail,
      tutorName,
      studentName,
    };

    const calendarResult = await createMeetEvent(eventDetails);
    nextMeetLink = calendarResult.meetLink;
    nextCalendarEventId = calendarResult.eventId;
    nextCalendarHtmlLink = calendarResult.htmlLink;
  }

  const tutorTokenRaw = generateRawToken();
  const tutorTokenHash = hashToken(tutorTokenRaw);
  const tutorTokenExpiry = buildTokenExpiry();
  const tutorCancelUrl = buildActionUrl('/booking/tutor-cancel', tutorTokenRaw);
  const now = new Date();

  await db.booking.update({
    where: { id: booking.id },
    data: {
      date: normalizedDate,
      time,
      status: booking.free ? 'confirmed' : 'completed',
      tutorCancelledAt: null,
      meetLink: nextMeetLink || null,
      calendarEventId: nextCalendarEventId,
      calendarHtmlLink: nextCalendarHtmlLink,

      tutorCancelTokenHash: tutorTokenHash,
      tutorCancelTokenExpiresAt: tutorTokenExpiry,
      tutorCancelTokenUsedAt: null,

      studentRescheduleTokenUsedAt: now,
      studentRefundTokenUsedAt: now,
      studentRescheduleTokenHash: null,
      studentRescheduleTokenExpiresAt: null,
      studentRefundTokenHash: null,
      studentRefundTokenExpiresAt: null,
    },
  });

  try {
    await sendBookingConfirmationEmails({
      tutorName,
      studentName,
      tutorEmail: booking.tutor.email,
      studentEmail: booking.studentEmail,
      date: formatDisplayDate(normalizedDate),
      startTime: time,
      endTime: calculateEndTime(time),
      tutorTimezone,
      studentTimezone: studentTimezone ?? tutorTimezone,
      meetingLink: nextMeetLink || 'N/A',
      calendarLink: nextCalendarHtmlLink,
      tutorCancelUrl,
    });
  } catch (error) {
    console.error(`Reschedule email dispatch failed for booking ${booking.id}:`, error);
  }

  return { bookingId: booking.id };
}

export async function getStudentRefundContext(token: string) {
  const booking = await getBookingFromToken('student_refund', token);

  if (booking.status !== 'cancelled_by_tutor') {
    throw new BookingActionError(
      'INVALID_STATE',
      'This booking is no longer waiting for a refund or reschedule action.',
    );
  }

  return {
    bookingId: booking.id,
    tutorName: buildTutorName(booking),
    studentName: booking.studentName ?? 'Student',
    date: formatDisplayDate(booking.date),
    time: booking.time,
    timeZone: booking.tutor.timezone ?? 'PST',
    amountCents: booking.totalAmountCents ?? 0,
    isFreeSession: booking.free,
  };
}

export async function refundBookingByToken(token: string): Promise<{ refunded: boolean; refundId: string | null }> {
  const booking = await getBookingFromToken('student_refund', token);

  if (booking.status !== 'cancelled_by_tutor') {
    throw new BookingActionError(
      'INVALID_STATE',
      'This booking is no longer waiting for a refund or reschedule action.',
    );
  }

  let refundId: string | null = null;

  if (!booking.free && booking.stripePaymentIntentId && (booking.totalAmountCents ?? 0) > 0) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          bookingId: booking.id,
          source: 'student_refund_token',
        },
      });
      refundId = refund.id;
    } catch (error: any) {
      throw new BookingActionError(
        'REFUND_FAILED',
        `Unable to process refund through Stripe: ${error?.message ?? 'unknown error'}`,
      );
    }
  }

  const earningsToReverse = booking.mentorEarningsCents ?? 0;
  const now = new Date();

  await db.$transaction(async (tx) => {
    if (earningsToReverse > 0 && booking.earningsProcessed) {
      let wallet = await tx.mentorWallet.findUnique({ where: { mentorId: booking.tutorId } });

      if (!wallet) {
        wallet = await tx.mentorWallet.create({
          data: { mentorId: booking.tutorId, availableCents: 0, pendingCents: 0 },
        });
      }

      let nextAvailable = wallet.availableCents;
      let nextPending = wallet.pendingCents;

      if (booking.fundsReleased) {
        nextAvailable = Math.max(0, wallet.availableCents - earningsToReverse);
      } else {
        nextPending = Math.max(0, wallet.pendingCents - earningsToReverse);
      }

      await tx.mentorWallet.update({
        where: { mentorId: booking.tutorId },
        data: {
          availableCents: nextAvailable,
          pendingCents: nextPending,
        },
      });

      await tx.mentorLedgerEntry.create({
        data: {
          mentorId: booking.tutorId,
          type: 'ADJUSTMENT',
          amountCents: -earningsToReverse,
          balanceAfterCents: booking.fundsReleased ? nextAvailable : nextPending,
          relatedSessionId: booking.id,
          stripePaymentIntentId: booking.stripePaymentIntentId,
          description: `Earnings reversed due to student refund for cancelled session ${booking.id}`,
        },
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'refunded',
        refundedAt: now,
        stripeRefundId: refundId,
        studentRefundTokenUsedAt: now,
        studentRescheduleTokenUsedAt: now,
        studentRefundTokenHash: null,
        studentRefundTokenExpiresAt: null,
        studentRescheduleTokenHash: null,
        studentRescheduleTokenExpiresAt: null,
        earningsProcessed: false,
        mentorEarningsCents: 0,
        fundsReleased: false,
        availableAt: null,
      },
    });
  });

  if (booking.calendarEventId) {
    await deleteCalendarEvent(booking.calendarEventId);
  }

  return {
    refunded: true,
    refundId,
  };
}
