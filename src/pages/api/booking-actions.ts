import type { NextApiRequest, NextApiResponse } from 'next';

import {
  BookingActionError,
  cancelBookingByTutorToken,
  getStudentRefundContext,
  getStudentRescheduleContext,
  getTutorCancelContext,
  refundBookingByToken,
  rescheduleBookingByToken,
} from '~/lib/bookingActions';

type ApiSuccess = {
  success: true;
  data?: unknown;
};

type ApiError = {
  success: false;
  error: string;
  code?: string;
};

type ApiResponse = ApiSuccess | ApiError;

function readString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function mapBookingError(error: unknown): { status: number; body: ApiError } {
  if (error instanceof BookingActionError) {
    if (error.code === 'INVALID_TOKEN' || error.code === 'EXPIRED_TOKEN' || error.code === 'TOKEN_ALREADY_USED') {
      return { status: 400, body: { success: false, error: error.message, code: error.code } };
    }

    if (error.code === 'SLOT_CONFLICT') {
      return { status: 409, body: { success: false, error: error.message, code: error.code } };
    }

    return { status: 422, body: { success: false, error: error.message, code: error.code } };
  }

  const genericError = error as { message?: string };
  return {
    status: 500,
    body: {
      success: false,
      error: genericError.message ?? 'Internal server error',
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    if (req.method === 'GET') {
      const action = readString(req.query.action);
      const token = readString(req.query.token);

      if (!action || !token) {
        return res.status(400).json({ success: false, error: 'Missing action or token' });
      }

      if (action === 'tutor-cancel-context') {
        const data = await getTutorCancelContext(token);
        return res.status(200).json({ success: true, data });
      }

      if (action === 'student-reschedule-context') {
        const data = await getStudentRescheduleContext(token);
        return res.status(200).json({ success: true, data });
      }

      if (action === 'student-refund-context') {
        const data = await getStudentRefundContext(token);
        return res.status(200).json({ success: true, data });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      const action = readString(req.body?.action);
      const token = readString(req.body?.token);

      if (!action || !token) {
        return res.status(400).json({ success: false, error: 'Missing action or token' });
      }

      if (action === 'tutor-cancel') {
        const data = await cancelBookingByTutorToken(token);
        return res.status(200).json({ success: true, data });
      }

      if (action === 'student-reschedule') {
        const date = readString(req.body?.date);
        const time = readString(req.body?.time);
        const studentTimezone = readString(req.body?.studentTimezone);

        if (!date || !time) {
          return res.status(400).json({ success: false, error: 'Missing reschedule date or time' });
        }

        const data = await rescheduleBookingByToken({
          token,
          date,
          time,
          studentTimezone,
        });

        return res.status(200).json({ success: true, data });
      }

      if (action === 'student-refund') {
        const data = await refundBookingByToken(token);
        return res.status(200).json({ success: true, data });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    const mapped = mapBookingError(error);
    return res.status(mapped.status).json(mapped.body);
  }
}
