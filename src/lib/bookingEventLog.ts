import type { PrismaClient, Prisma, BookingEventType } from "@prisma/client";

export interface BookingEventLogInput {
  bookingId?: string;
  eventType: BookingEventType;
  message: string;
  tutorId?: string;
  tutorEmail?: string;
  studentEmail?: string;
  totalAmountCents?: number;
  platformFeeCents?: number;
  mentorEarningsCents?: number;
  stripePaymentIntentId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createBookingEventLog(db: PrismaClient, input: BookingEventLogInput) {
  try {
    await db.bookingEventLog.create({
      data: {
        bookingId: input.bookingId,
        eventType: input.eventType,
        message: input.message,
        tutorId: input.tutorId,
        tutorEmail: input.tutorEmail,
        studentEmail: input.studentEmail,
        totalAmountCents: input.totalAmountCents,
        platformFeeCents: input.platformFeeCents,
        mentorEarningsCents: input.mentorEarningsCents,
        stripePaymentIntentId: input.stripePaymentIntentId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write booking event log:", error);
  }
}
