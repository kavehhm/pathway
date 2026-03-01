/**
 * Email Templates Index
 * 
 * Export all email templates from a single location.
 */

export {
  tutorBookingConfirmationEmail,
  studentBookingConfirmationEmail,
  type BookingConfirmationParams,
} from './bookingConfirmation';
export {
  studentBookingCancelledByTutorEmail,
  type StudentBookingCancelledByTutorParams,
} from './bookingCancellation';

// EDU verification template is not yet implemented
// export { eduVerificationEmail, type EduVerificationParams } from './eduVerification';
