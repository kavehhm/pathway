import { useRouter } from "next/router";
import React from "react";
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
import { useUser } from "@clerk/nextjs";
import Cal from "@calcom/embed-react";


const User = () => {
  const router = useRouter();
  const user = useUser();
  const username = router.query.username;
  const person = api.post.getTutor.useQuery(user.user?.id ?? "");

  const tutor = api.post.getSingleTutor.useQuery(username as string);
  const policies = [
    {
      name: `Online ${tutor.data?.tutorInPerson ? "& in person " : ""}Tutoring`,
      icon: GlobeAmericasIcon,
      description: `Work with ${tutor.data?.firstName ?? "No Name"}  ${
        tutor.data?.tutorInPerson ? "from anywhere" : "online"
      }!`,
    },
  ];

  if (tutor.data?.approved) {
    policies.unshift({
      name: "Approved",
      icon: CheckCircleIcon,
      description: "This tutor has been verified.",
    });
  }

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className="bg-white">
      <div className="pb-24 pt-6 sm:pb-0 ">
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
                <h1 className="text-xl flex gap-3 items-center font-medium text-gray-900">
                  {tutor.data?.firstName} {tutor.data?.lastName}{" "}
                  {(person && person.data?.username == username) && <Link className="cursor-pointer" href={"/tutor-onboarding"}><FaEdit className="hover:text-indigo-600 " /></Link>}
                </h1>
                <p className="text-xl font-medium text-gray-900">
                  ${tutor.data?.hourlyRate} / hour
                </p>
                {/* ADD TUTOR PRICE */}
              </div>
              {/* Reviews */}
              {/* <div className="mt-4">
                <h2 className="sr-only">Reviews</h2>
                <div className="flex items-center">
                  <p className="text-sm text-gray-700">
                    {(tutor.data?.reviewPoints as number) / (tutor.data?.reviewQuantity as number) ?? 0}
                    <span className="sr-only"> out of 5 stars</span>
                  </p>
                  <div className="ml-1 flex items-center">
                    {[0, 1, 2, 3, 4].map((rating) => (
                      <StarIcon
                        key={rating}
                        className={classNames(
                          ((tutor.data?.reviewPoints as number) / (tutor.data?.reviewQuantity as number) ?? 0) > rating ? 'text-yellow-400' : 'text-gray-200',
                          'h-5 w-5 flex-shrink-0'
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div aria-hidden="true" className="ml-4 text-sm text-gray-300">
                    ·
                  </div>
                  <div className="ml-4 flex">
                    <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      See all {tutor.data?.reviewQuantity} reviews
                    </a>
                  </div>
                </div>
              </div> */}
            </div>

            {/* Image gallery */}
            <div className="mt-8  lg:col-span-5 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:mt-0">
              <h2 className="sr-only">Images</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 lg:gap-8">
                <img
                  key={tutor.data?.username}
                  src={tutor.data?.imageSrc}
                  alt={tutor.data?.firstName}
                  className={
                    " hidden rounded-lg lg:col-span-2 lg:row-span-2 aspect-[2/2] object-cover w-full  lg:block lg:w-auto"
                  }
                />
                <img
                  key={tutor.data?.username}
                  src={tutor.data?.imageSrc}
                  alt={tutor.data?.firstName}
                  className={"  w-full rounded-lg sm:hidden"}
                />
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
                <h2 className="text-sm font-medium text-gray-900">
                  School: 
                </h2>
                <div
                  className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                  // dangerouslySetInnerHTML={{ __html: product.description }}
                >
                  {tutor.data?.school}
                </div>


              </div>
              <div className="mt-5">
                <h2 className="text-sm font-medium text-gray-900">
                  Major: 
                </h2>
                <div
                  className="prose prose-sm mt-4 whitespace-pre-line text-gray-500"

                  // dangerouslySetInnerHTML={{ __html: product.description }}
                >
                  {tutor.data?.major}
                </div>


              </div>
              <div className="mt-5">
                <h2 className="text-sm font-medium text-gray-900">
                  GPA: 
                </h2>
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

     {tutor.data?.calendlyLink &&
      <div id="bookappointment" className=" py-12 ">
        <Cal  calLink={tutor.data?.calendlyLink ?? "/pathwaytutors/15min"} />
      </div>}
    </div>
  );
};

export default User;
