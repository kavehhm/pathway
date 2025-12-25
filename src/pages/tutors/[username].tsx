import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import {
  CurrencyDollarIcon,
  GlobeAmericasIcon,
  CheckCircleIcon,
  StarIcon,
} from "@heroicons/react/20/solid";
import { InlineWidget } from "react-calendly";
import Link from "next/link";
import { FaEdit } from "react-icons/fa";
import { useUser, useClerk } from "@clerk/nextjs";
import Cal from "@calcom/embed-react";
import { getCalApi } from "@calcom/embed-react";
import emailjs from "@emailjs/browser";
import ManualCal from "~/components/ManualCal";
import { TbFreeRights } from "react-icons/tb";
import toast from "react-hot-toast";


const User = () => {
  const router = useRouter();
  const user = useUser();
  const { openSignUp } = useClerk();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [editingReview, setEditingReview] = useState<string | null>(null);

  const username = router.query.username;
  const person = api.post.getTutor.useQuery(user.user?.id ?? "");

  const tutor = api.post.getSingleTutor.useQuery(username as string);
  const bookingCount = api.post.getBookingCount.useQuery(tutor.data?.clerkId ?? "");
  const tutorCourses = api.post.getTutorCourses.useQuery(tutor.data?.clerkId ?? "", {
    enabled: !!tutor.data?.clerkId,
  });
  const tutorRating = api.post.getTutorRating.useQuery(tutor.data?.clerkId ?? "", {
    enabled: !!tutor.data?.clerkId,
  });
  const tutorReviews = api.post.getTutorReviews.useQuery(tutor.data?.clerkId ?? "", {
    enabled: !!tutor.data?.clerkId,
  });

  const addTutorResponse = api.post.addTutorResponse.useMutation({
    onSuccess: () => {
      toast.success("Response added successfully!");
      setEditingReview(null);
      setResponseText({});
      void tutorReviews.refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message || "Failed to add response");
    },
  });
  const policies = [
    // Online tutoring badge removed to move booking card up
    // {
    //   name: `Online ${tutor.data?.tutorInPerson ? "& in person " : ""}Tutoring`,
    //   icon: GlobeAmericasIcon,
    //   description: `Work with ${tutor.data?.firstName ?? "No Name"}  ${
    //     tutor.data?.tutorInPerson ? "from anywhere" : "online"
    //   }!`,
    // },
  ];

  if (tutor.data?.firstSessionFree ) {
    policies.unshift({
      name: "First Session Free",
      icon: TbFreeRights, 
      description: "This tutor allows your first session to be free",
    });
  }

  useEffect(() => {
    setFirstName(tutor.data?.firstName ?? "");
    setEmail(tutor.data?.email ?? "");
    setUserId(tutor.data?.id ?? "");
  }, [tutor.isFetchedAfterMount]);

  useEffect(() => {
    async function setupCalListener() {
      const cal = await getCalApi();
      cal("on", {
        action: "bookingSuccessful",
        callback: (e) => {
          const { data, type, namespace } = e.detail;

          e.preventDefault();

          console.log("Booking data:", e.detail.data);

          const startDate = new Date(
             // @ts-expect-error comment
            e.detail.data.booking.startTime,
          ).toLocaleTimeString();
          const endDate = new Date(
             // @ts-expect-error comment
            e.detail.data.booking.endTime,
          ).toLocaleTimeString();

           
          const formParams = {
            tutor_name: firstName,
             // @ts-expect-error comment
            student_name: e.detail.data.booking.attendees[0].name,
            start_time: startDate,
            end_time: endDate,
             // @ts-expect-error comment
            timeZone: e.detail.data.timeZone,
             // @ts-expect-error comment
            student_email: e.detail.data.booking.attendees[0].email,
            tutor_email: email,
            // @ts-expect-error comment
            location: e.detail.data.booking.location,
          };

          console.log(formParams);
          // To tutor
          emailjs
            .send("service_z8zzszl", "template_z7etjno", formParams, {
              publicKey: "To4xMN8D9pz4wwmq8",
            })
            .then(
              (result) => {
                console.log("We have received your message!");
                // form.current.reset();
              },
              (error) => {
                console.log(error);
              },
            );
            
            // To student
            emailjs
            .send("service_z8zzszl", "template_gvkyabt", formParams, {
              publicKey: "To4xMN8D9pz4wwmq8",
            })
            .then(
              (result) => {
                console.log("We have received your message!");
                // form.current.reset();
              },
              (error) => {
                console.log(error);
              },
            );
        },
      });
    }
    setupCalListener();
  }, []);

  return (
    <div className="min-h-screen py-12">
      <div className="mt-8 pb-24 pt-6 sm:pb-0">
        {/* <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol role="list" className="flex items-center space-x-4">
            {product.breadcrumbs.map((breadcrumb) => (
              <li key={breadcrumb.id}>
                <div className="flex items-center">
                  <a href={breadcrumb.href} className="mr-4 text-sm font-medium text-gray-900">
                    {breadcrumb.name}
                  </a>
                  <svg viewBox="0 0 6 20" aria-hidden="true" className="h-5 w-auto text-gray-300">
                    <path d="M4.878 4.34H3.551L.27 16.532h1.327l3.281-12.19z" fill="currentColor" />
                  </svg>
                </div>
              </li>
            ))}
            <li className="text-sm">
              <a href={product.href} aria-current="page" className="font-medium text-gray-500 hover:text-gray-600">
                {product.name}
              </a>
            </li>
          </ol>
        </nav> */}
        <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:auto-rows-min lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="flex justify-between sm:items-center">
                <img
                  key={tutor.data?.username}
                  src={tutor.data?.imageSrc}
                  alt={tutor.data?.firstName}
                  className={"hidden w-48 rounded-full sm:block lg:hidden"}
                />
                <h1 className="flex items-center gap-3 text-xl font-medium text-gray-900">
                  {tutor.data?.firstName} {tutor.data?.lastName}{" "}
                  {person && person.data?.username == username && (
                    <Link className="cursor-pointer" href={"/tutor-onboarding"}>
                      <FaEdit className="hover:text-indigo-600 " />
                    </Link>
                  )}
                </h1>
                <p className="text-xl font-medium text-gray-900">
                  ${tutor.data?.hourlyRate} / hour
                </p>
                {/* ADD TUTOR PRICE */}
              </div>
              {/* Verified / Not Verified flag - HIDDEN FOR NOW
              <div className="mt-2">
                {Boolean((tutor.data as any)?.eduVerified) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Verified · {((tutor.data as any)?.eduEmail ?? '').split('@')[1]}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                    Not verified
                  </span>
                )}
              </div>
              */}

              {/* Reviews */}
              <div className="mt-4">
                <h2 className="sr-only">Reviews</h2>
                <div className="flex items-center">
                  {tutorRating.data && tutorRating.data.reviewCount > 0 ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {tutorRating.data.averageRating.toFixed(1)}
                        <span className="sr-only"> out of 5 stars</span>
                      </p>
                      <div className="ml-2 flex items-center">
                        {[0, 1, 2, 3, 4].map((rating) => {
                          const avgRating = tutorRating.data?.averageRating ?? 0;
                          const isFullStar = avgRating >= rating + 1;
                          const isHalfStar = avgRating >= rating + 0.5 && avgRating < rating + 1;
                          
                          return (
                            <div key={rating} className="relative">
                              {isHalfStar ? (
                                <>
                                  <StarIcon className="h-5 w-5 flex-shrink-0 text-gray-200" aria-hidden="true" />
                                  <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                    <StarIcon className="h-5 w-5 flex-shrink-0 text-yellow-400" aria-hidden="true" />
                                  </div>
                                </>
                              ) : (
                                <StarIcon
                                  className={`h-5 w-5 flex-shrink-0 ${isFullStar ? 'text-yellow-400' : 'text-gray-200'}`}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div aria-hidden="true" className="ml-3 text-sm text-gray-300">
                        ·
                      </div>
                      <div className="ml-3 flex">
                        <a href="#reviews" className="text-sm font-medium text-violet-600 hover:text-violet-500">
                          {tutorRating.data.reviewCount} {tutorRating.data.reviewCount === 1 ? 'review' : 'reviews'}
                        </a>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No reviews yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Image gallery */}
            <div className="mt-8  lg:col-span-5 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <h2 className="sr-only">Images</h2>

              <div className="relative grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 lg:gap-8">
                <img
                  key={tutor.data?.username}
                  src={tutor.data?.imageSrc}
                  alt={tutor.data?.firstName}
                  className={
                    " hidden aspect-[2/2] w-full rounded-lg object-cover lg:col-span-2 lg:row-span-2  lg:block lg:w-auto"
                  }
                />
                <img
                  key={tutor.data?.username}
                  src={tutor.data?.imageSrc}
                  alt={tutor.data?.firstName}
                  className={"  w-full rounded-lg sm:hidden"}
                />
                
                {/* Booking count badge overlapping the image */}
                <div className="absolute bottom-4 left-4 z-10">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-2 shadow-lg">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                      <span className="text-xs font-semibold text-indigo-600">
                        {bookingCount.data ?? 0}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      paid booking{bookingCount.data != 1 && <span>s</span> }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 lg:col-span-7">
              <form>
                {/* Color picker */}
                {/* <div>
                  <h2 className="text-sm font-medium text-gray-900">Color</h2>

                  <RadioGroup value={selectedColor} onChange={setSelectedColor} className="mt-2">
                    <RadioGroup.Label className="sr-only">Choose a color</RadioGroup.Label>
                    <div className="flex items-center space-x-3">
                      {product.colors.map((color) => (
                        <RadioGroup.Option
                          key={color.name}
                          value={color}
                          className={({ active, checked }) =>
                            classNames(
                              color.selectedColor,
                              active && checked ? 'ring ring-offset-1' : '',
                              !active && checked ? 'ring-2' : '',
                              'relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none'
                            )
                          }
                        >
                          <RadioGroup.Label as="span" className="sr-only">
                            {color.name}
                          </RadioGroup.Label>
                          <span
                            aria-hidden="true"
                            className={classNames(
                              color.bgColor,
                              'h-8 w-8 rounded-full border border-black border-opacity-10'
                            )}
                          />
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>
                </div> */}

                {/* Size picker */}
                {/* <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-900">Size</h2>
                    <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      See sizing chart
                    </a>
                  </div>

                  <RadioGroup value={selectedSize} onChange={setSelectedSize} className="mt-2">
                    <RadioGroup.Label className="sr-only">Choose a size</RadioGroup.Label>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {product.sizes.map((size) => (
                        <RadioGroup.Option
                          key={size.name}
                          value={size}
                          className={({ active, checked }) =>
                            classNames(
                              size.inStock ? 'cursor-pointer focus:outline-none' : 'cursor-not-allowed opacity-25',
                              active ? 'ring-2 ring-indigo-500 ring-offset-2' : '',
                              checked
                                ? 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
                              'flex items-center justify-center rounded-md border py-3 px-3 text-sm font-medium uppercase sm:flex-1'
                            )
                          }
                          disabled={!size.inStock}
                        >
                          <RadioGroup.Label as="span">{size.name}</RadioGroup.Label>
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>
                </div> */}

                <Link
                  href={"#bookappointment"}
                  className=" flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Book now
                </Link>
              </form>

              {/* Product details */}
              <div className="flex justify-between ">
                <div className="mt-5">
                  <h2 className="text-sm font-medium text-gray-900">School:</h2>
                  <div
                    className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                    // dangerouslySetInnerHTML={{ __html: product.description }}
                  >
                    {tutor.data?.school}
                  </div>
                </div>
                <div className="mt-5">
                  <h2 className="text-sm font-medium text-gray-900">Major:</h2>
                  <div
                    className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                    // dangerouslySetInnerHTML={{ __html: product.description }}
                  >
                    {tutor.data?.major}
                  </div>
                </div>
                <div className="mt-5">
                  <h2 className="text-sm font-medium text-gray-900">GPA:</h2>
                  <div
                    className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                    // dangerouslySetInnerHTML={{ __html: product.description }}
                  >
                    {tutor.data?.gpa}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <h2 className="text-sm font-medium text-gray-900">
                  Description
                </h2>

                <div
                  className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                  // dangerouslySetInnerHTML={{ __html: product.description }}
                >
                  {tutor.data?.description}
                </div>
              </div>

              <div className="mt-8 border-t border-gray-200 pt-8">
                <h2 className="text-sm font-medium text-gray-900">Subjects</h2>

                <div className="prose prose-sm mt-4 text-gray-500">
                  <div role="list" className="flex flex-wrap gap-5">
                    {tutor.data?.subjects.map((item) => (
                      <div
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-6 py-4 text-center text-indigo-500"
                        key={item}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Courses Section */}
              {tutorCourses.data && tutorCourses.data.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-8">
                  <h2 className="text-sm font-medium text-gray-900">
                    {tutor.data?.school} Courses
                  </h2>

                  <div className="prose prose-sm mt-4 text-gray-500">
                    <div role="list" className="flex flex-wrap gap-3">
                      {tutorCourses.data.map((course) => (
                        <div
                          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-700"
                          key={course.id}
                        >
                          <span className="font-semibold">{course.courseId}</span>
                          <span className="mx-2">·</span>
                          <span>{course.courseName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Policies */}
              <section
                aria-labelledby="policies-heading"
                className=" mt-8 border-t border-gray-200 pt-8"
              >
                <h2 id="policies-heading" className="sr-only">
                  Our Policies
                </h2>

                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.name}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center"
                    >
                      <dt>
                        <policy.icon
                          className="mx-auto h-6 w-6 flex-shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="mt-4 text-sm font-medium text-gray-900">
                          {policy.name}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm text-gray-500">
                        {policy.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* {tutor.data?.calendlyLink && (
        <div id="bookappointment" className=" py-12 ">
          <Cal calLink={tutor.data?.calendlyLink ?? "/pathwaytutors/15min"} />
        </div>
      )} */}
      <div id="bookappointment" className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <ManualCal userId={username as string} />
      </div>

      {/* Reviews Section */}
      <div id="reviews" className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Student Reviews</h2>
          
          {/* CTA for non-signed-in users */}
          {!user.isSignedIn && (
            <div className="mb-8 rounded-xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-8 text-center">
              <p className="text-gray-900 text-lg mb-4">
                Create an account to write a review
              </p>
              <button
                onClick={() => openSignUp()}
                className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              >
                Sign Up
              </button>
            </div>
          )}
          
          {tutorReviews.data && tutorReviews.data.length > 0 ? (
            <div className="space-y-8">
              {tutorReviews.data
                .filter((review: any) => review.reviewText && review.reviewText.trim() !== '')
                .map((review: any) => (
                  <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Review Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          {review.student.imageSrc && (
                            <img
                              src={review.student.imageSrc}
                              alt={`${review.student.firstName} ${review.student.lastName}`}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.student.firstName} {review.student.lastName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[0, 1, 2, 3, 4].map((rating) => {
                                  const isFullStar = review.rating >= rating + 1;
                                  const isHalfStar = review.rating >= rating + 0.5 && review.rating < rating + 1;
                                  
                                  return (
                                    <div key={rating} className="relative">
                                      {isHalfStar ? (
                                        <>
                                          <StarIcon className="h-4 w-4 text-gray-200" />
                                          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                            <StarIcon className="h-4 w-4 text-yellow-400" />
                                          </div>
                                        </>
                                      ) : (
                                        <StarIcon
                                          className={`h-4 w-4 ${isFullStar ? 'text-yellow-400' : 'text-gray-200'}`}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Review Text */}
                      <p className="mt-4 text-gray-700 leading-relaxed">
                        {review.reviewText}
                      </p>
                    </div>

                    {/* Tutor Response */}
                    {review.tutorResponse && editingReview !== review.id ? (
                      <div className="bg-violet-50 px-6 py-4 border-t border-violet-100">
                        <div className="flex items-start gap-3">
                          {tutor.data?.imageSrc && (
                            <img
                              src={tutor.data.imageSrc}
                              alt={`${tutor.data.firstName} ${tutor.data.lastName}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-900">
                                Response from {tutor.data?.firstName}
                              </p>
                              {user.user?.id === tutor.data?.clerkId && (
                                <button
                                  onClick={() => {
                                    setEditingReview(review.id);
                                    setResponseText({ ...responseText, [review.id]: review.tutorResponse ?? '' });
                                  }}
                                  className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                                >
                                  Edit Response
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-700">
                              {review.tutorResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : user.user?.id === tutor.data?.clerkId && (!review.tutorResponse || editingReview === review.id) ? (
                      <div className="bg-violet-50 px-6 py-4 border-t border-violet-100">
                        <div className="flex items-start gap-3">
                          {tutor.data?.imageSrc && (
                            <img
                              src={tutor.data.imageSrc}
                              alt={`${tutor.data.firstName} ${tutor.data.lastName}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-2">
                              {review.tutorResponse ? 'Edit your response' : 'Respond to this review'}
                            </p>
                            <textarea
                              value={responseText[review.id] ?? ''}
                              onChange={(e) => setResponseText({ ...responseText, [review.id]: e.target.value })}
                              placeholder="Write your response..."
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                              rows={3}
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => {
                                  if (!responseText[review.id]?.trim()) {
                                    toast.error("Please write a response");
                                    return;
                                  }
                                  addTutorResponse.mutate({
                                    reviewId: review.id,
                                    tutorResponse: responseText[review.id] ?? '',
                                  });
                                }}
                                disabled={addTutorResponse.isLoading}
                                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
                              >
                                {addTutorResponse.isLoading ? 'Submitting...' : 'Submit Response'}
                              </button>
                              {editingReview === review.id && (
                                <button
                                  onClick={() => {
                                    setEditingReview(null);
                                    setResponseText({ ...responseText, [review.id]: review.tutorResponse ?? '' });
                                  }}
                                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No reviews yet!</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default User;
