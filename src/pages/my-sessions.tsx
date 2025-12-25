import { useUser } from "@clerk/nextjs";
import { StarIcon } from "@heroicons/react/20/solid";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

const MySessions = () => {
  const { user } = useUser();
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Fetch sessions where user is the student
  const reviewableBookings = api.post.getReviewableBookings.useQuery(
    user?.id ?? "",
    { enabled: !!user?.id }
  );

  // Fetch sessions where user is the tutor
  const tutorBookings = api.post.getTutorBookings.useQuery(
    user?.id ?? "",
    { enabled: !!user?.id }
  );

  const createReview = api.post.createReview.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setSelectedBooking(null);
      setRating(0);
      setReviewText("");
      setEditingReviewId(null);
      void reviewableBookings.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const updateReview = api.post.updateReview.useMutation({
    onSuccess: () => {
      toast.success("Review updated successfully!");
      setSelectedBooking(null);
      setRating(0);
      setReviewText("");
      setEditingReviewId(null);
      void reviewableBookings.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update review");
    },
  });

  const handleSubmitReview = (bookingId: string, tutorClerkId: string) => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (editingReviewId) {
      updateReview.mutate({
        reviewId: editingReviewId,
        rating,
        reviewText: reviewText.trim() || undefined,
      });
    } else {
      createReview.mutate({
        bookingId,
        tutorClerkId,
        studentClerkId: user?.id ?? "",
        rating,
        reviewText: reviewText.trim() || undefined,
      });
    }
  };

  const handleEditReview = (booking: any) => {
    setSelectedBooking(booking.id);
    setEditingReviewId(booking.review.id);
    setRating(booking.review.rating);
    setReviewText(booking.review.reviewText || "");
  };

  const StarRating = ({ value, onChange, interactive = true }: { value: number; onChange?: (val: number) => void; interactive?: boolean }) => {
    const [hovered, setHovered] = useState(0);

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFullStar = (interactive ? (hovered || value) : value) >= star;
          const isHalfStar = (interactive ? (hovered || value) : value) >= star - 0.5 && (interactive ? (hovered || value) : value) < star;

          return (
            <div key={star} className="relative">
              {interactive ? (
                <>
                  {/* Full star clickable area */}
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange?.(star)}
                    className="relative"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${isFullStar ? 'text-yellow-400' : 'text-gray-300'} transition-colors`}
                    />
                  </button>
                  {/* Half star clickable area */}
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(star - 0.5)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange?.(star - 0.5)}
                    className="absolute inset-0 w-1/2 overflow-hidden"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${isHalfStar ? 'text-yellow-400' : 'text-gray-300'} transition-colors`}
                    />
                  </button>
                </>
              ) : (
                <div className="relative">
                  {isHalfStar ? (
                    <>
                      <StarIcon className="h-6 w-6 text-gray-200" />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                        <StarIcon className="h-6 w-6 text-yellow-400" />
                      </div>
                    </>
                  ) : (
                    <StarIcon
                      className={`h-6 w-6 ${isFullStar ? 'text-yellow-400' : 'text-gray-200'}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view your sessions</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Sessions - Pathway</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
            <p className="mt-2 text-gray-600">Manage your sessions as a student and tutor</p>
          </div>

          {/* Sessions as Student */}
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Sessions as Student</h2>
              <p className="mt-1 text-sm text-gray-600">Sessions where you received tutoring</p>
            </div>

          {reviewableBookings.isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading your sessions...</p>
            </div>
          ) : reviewableBookings.data && reviewableBookings.data.length > 0 ? (
            <div className="space-y-6">
              {reviewableBookings.data.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Booking Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {booking.tutor.imageSrc && (
                          <img
                            src={booking.tutor.imageSrc}
                            alt={`${booking.tutor.firstName} ${booking.tutor.lastName}`}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <Link
                            href={`/tutors/${booking.tutor.clerkId}`}
                            className="text-lg font-semibold text-gray-900 hover:text-violet-600"
                          >
                            {booking.tutor.firstName} {booking.tutor.lastName}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {new Date(booking.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}{' '}
                            at {booking.time}
                          </p>
                        </div>
                      </div>
                      {booking.review ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                          Pending Review
                        </span>
                      )}
                    </div>

                    {/* Existing Review Display */}
                    {booking.review && selectedBooking !== booking.id && (
                      <div className="mt-6 rounded-lg bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <StarRating value={booking.review.rating} interactive={false} />
                          <button
                            onClick={() => handleEditReview(booking)}
                            className="text-sm font-medium text-violet-600 hover:text-violet-700"
                          >
                            Edit Review
                          </button>
                        </div>
                        {booking.review.reviewText && (
                          <p className="mt-2 text-gray-700">{booking.review.reviewText}</p>
                        )}
                        {booking.review.tutorResponse && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              Response from {booking.tutor.firstName}:
                            </p>
                            <p className="text-sm text-gray-700">{booking.review.tutorResponse}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review Form */}
                    {(!booking.review || selectedBooking === booking.id) && (
                      <div className="mt-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Rating
                            </label>
                            <StarRating value={rating} onChange={setRating} />
                          </div>

                          <div>
                            <label
                              htmlFor={`review-${booking.id}`}
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              Your Review (Optional)
                            </label>
                            <textarea
                              id={`review-${booking.id}`}
                              rows={4}
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              placeholder="Share your experience with this tutor..."
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleSubmitReview(booking.id, booking.tutor.clerkId)}
                              disabled={createReview.isLoading || updateReview.isLoading || rating === 0}
                              className="inline-flex items-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {createReview.isLoading || updateReview.isLoading ? (
                                "Submitting..."
                              ) : editingReviewId ? (
                                "Update Review"
                              ) : (
                                "Submit Review"
                              )}
                            </button>
                            {(selectedBooking === booking.id && booking.review) && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(null);
                                  setRating(0);
                                  setReviewText("");
                                  setEditingReviewId(null);
                                }}
                                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <StarIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed sessions as student yet</h3>
              <p className="text-gray-500 mb-6">
                After completing a paid session with a tutor, you will be able to leave a review here.
              </p>
              <Link
                href="/tutors"
                className="inline-flex items-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                Browse Tutors
              </Link>
            </div>
          )}
          </div>

          {/* Sessions as Tutor */}
          <div className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Sessions as Tutor</h2>
              <p className="mt-1 text-sm text-gray-600">Sessions where you provided tutoring</p>
            </div>

            {tutorBookings.isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading your tutoring sessions...</p>
              </div>
            ) : tutorBookings.data && tutorBookings.data.length > 0 ? (
              <div className="space-y-6">
                {tutorBookings.data.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Booking Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          {booking.student?.imageSrc && (
                            <img
                              src={booking.student.imageSrc}
                              alt={`${booking.student.firstName} ${booking.student.lastName}`}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="text-lg font-semibold text-gray-900">
                              {booking.student?.firstName} {booking.student?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(booking.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}{' '}
                              at {booking.time}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                          Completed
                        </span>
                      </div>

                      {/* Review Display if exists */}
                      {booking.review && (
                        <div className="mt-6 rounded-lg bg-gray-50 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StarRating value={booking.review.rating} interactive={false} />
                              <span className="text-sm text-gray-600">
                                Review from student
                              </span>
                            </div>
                          </div>
                          {booking.review.reviewText && (
                            <p className="mt-2 text-gray-700">{booking.review.reviewText}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <StarIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed sessions as tutor yet</h3>
                <p className="text-gray-500 mb-6">
                  When students complete paid sessions with you, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MySessions;

