/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { UserButton, useUser } from "@clerk/nextjs";
import { PhotoIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import Multiselect from "multiselect-react-dropdown";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { LoaderIcon } from "react-hot-toast";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import schools from "~/schools";
import majors from "~/majors";
import subjectList from "~/subjectOptions";

const BIO_LENGTH = 250;

export default function Example() {
  const router = useRouter();

  const user = useUser();

  const tutor = api.post.getTutor.useQuery(user.user?.id ?? "");
  const [bio, setBio] = useState(tutor.data?.bio);

  const [username, setUsername] = useState(tutor.data?.username);
  const [school, setSchool] = useState(tutor.data?.school);
  const [major, setMajor] = useState(tutor.data?.major);
  const [approved, setApproved] = useState(tutor.data?.approved);
  const [description, setDescription] = useState(tutor.data?.description);

  const [gpa, setGpa] = useState(tutor.data?.gpa ?? 0.0);
  const [country, setCountry] = useState(tutor.data?.country);
  const [state, setState] = useState(tutor.data?.state);
  const [zipCode, setZipCode] = useState(tutor.data?.zipCode);
  const [tutorInPerson, setTutorInPerson] = useState(tutor.data?.tutorInPerson);
  const [seletedSubjects, setSelectedSubjects] = useState(tutor.data?.subjects);
  const [hourlyRate, setHourlyRate] = useState(tutor.data?.hourlyRate);
  const [firstSessionFree, setFirstSessionFree] = useState(false);
  const [availability, setAvailability] = useState("")
  const [otherSchoolName, setOtherSchoolName] = useState("");
  const [otherMajor, setOtherMajor] = useState("");
  const [meetingLink, setMeetingLink] = useState(tutor.data?.meetingLink)
  // const subjects = api.post.getAllSubjects.useQuery();
  const createTutor = api.post.createTutor.useMutation({
    onSuccess: async () => {
      await tutor.refetch();
    },
  });

  useEffect(() => {
    setBio(tutor.data?.bio);
    setUsername(tutor.data?.username);
    setSchool(tutor.data?.school);
    setMajor(tutor.data?.major);
    setApproved(tutor.data?.approved);
    setDescription(tutor.data?.description);
    setGpa(tutor.data?.gpa as number);
    setCountry(tutor.data?.country);
    setState(tutor.data?.state);
    setZipCode(tutor.data?.zipCode);
    setTutorInPerson(tutor.data?.tutorInPerson);
    setSelectedSubjects(tutor.data?.subjects);
    setMeetingLink(tutor.data?.meetingLink)
  }, [tutor.isFetchedAfterMount]);

  const updateUser = api.post.updateTutor.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated");
      await router.replace(`/tutors/${tutor.data?.username}`);
    },
  });

  useEffect(() => {
    console.log(seletedSubjects);
  }, [seletedSubjects]);

  console.log(tutorInPerson);
  if (tutor.data && tutor.isFetchedAfterMount)
    return (
      <div className="p-10 lg:p-48">
        <div className="space-y-12">
          <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Profile
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              This information will be displayed publicly so be careful what you
              share.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label
                  htmlFor="photo"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Photo & Name (Click update in modal and bottom of this page)
                </label>
                <div className="mt-2 flex items-center gap-x-3">
                  <UserButton />
                  <p className="text-xs">{"<- Click"}</p>
                </div>
              </div>
              <div className="sm:col-span-full">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Username
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                    <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                      pathwayapp.com/tutors/
                    </span>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      autoComplete="username"
                      className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                      placeholder="janesmith"
                      value={username as string}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-full">
                <label
                  htmlFor="hourlyRate"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Hourly Rate ($)
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                    <input
                      type="number"
                      name="username"
                      id="username"
                      className="block flex-1 border-0 bg-transparent py-1.5 pl-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                      placeholder="10"
                      value={hourlyRate != 0 ? hourlyRate : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          const rate = parseFloat(e.target.value);

                          setHourlyRate(
                            Math.round((rate + Number.EPSILON) * 100) / 100,
                          );
                        } else {
                          setHourlyRate(0);
                        }
                      }}
                    />
                    <span className="flex select-none items-center pr-3 text-gray-500 sm:text-sm">
                      You receive: $
                      {Math.round(
                        ((hourlyRate ?? 0) * 0.8 + Number.EPSILON) * 100,
                      ) / 100}
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-span-full">
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Bio
                </label>
                <p className="text-xs text-gray-800">
                  {bio ? bio.length : 0} / {BIO_LENGTH}
                </p>
                <div className="mt-2">
                  <textarea
                    onChange={(e) => setBio(e.target.value)}
                    id="bio"
                    name="bio"
                    rows={2}
                    maxLength={BIO_LENGTH}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={bio}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Write a few sentences about yourself. Max 250 char. (Visible
                  in the tutors panel)
                </p>
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="about"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  About
                </label>
                <div className="mt-2">
                  <textarea
                    id="about"
                    name="about"
                    rows={3}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Go into detail about yourself and what you teach. (Visible
                  once your profile is opened)
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Personal Information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              This is the information that you will be matched with students
              based on
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Schooling
                </label>
                <div className="mt-2">
                  <select
                    id="country"
                    name="country"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                    defaultValue={school}
                    onChange={(e) => setSchool(e.target.value)}
                  >
                    <option selected>{school ?? "None"}</option>

                    {schools.map((school) => (
                      <option key={school}>{school}</option>
                    ))}
                    <option>Other</option>
                  </select>
                </div>
              </div>
              {school == "Other" && (
                <div className="sm:col-span-full">
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Other School Name
                  </label>
                  <div className="mt-2">
                    <input
                      id="country"
                      name="country"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                      defaultValue={otherSchoolName}
                      onChange={(e) => setOtherSchoolName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Major
                </label>
                <div className="mt-2">
                  <select
                    id="country"
                    name="country"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  >
                    <option selected>{major ?? "None"}</option>

                    {majors.map((major) => (
                      <option key={school}>{major}</option>
                    ))}
                    <option>Other</option>
                  </select>
                </div>
              </div>
              {major == "Other" && (
                <div className="sm:col-span-full">
                  <label
                    htmlFor="country"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Other Major
                  </label>
                  <div className="mt-2">
                    <input
                      id="country"
                      name="country"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                      value={otherMajor}
                      onChange={(e) => setOtherMajor(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  GPA
                </label>
                <div className="mt-2">
                  <input
                    type={"number"}
                    max="4"
                    min={"0"}
                    value={gpa !== 0 ? gpa : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setGpa(parseFloat(e.target.value));
                      } else {
                        setGpa(0);
                      }
                    }}
                    id="country"
                    required
                    name="country"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Subjects
                </label>
                <div className="mt-2">
                  <Multiselect
                    selectedValues={seletedSubjects}
                    displayValue="subject"
                    isObject={false}
                    onRemove={(selectedList, selectedItem) => {
                      // selectedList.push(selectedItem)

                      setSelectedSubjects(selectedList);
                    }}
                    onSelect={(selectedList, selectedItem) => {
                      // selectedList.push(selectedItem)

                      setSelectedSubjects(selectedList);
                    }}
                    options={subjectList}
                    className="block w-full rounded-md border-0  text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  First session free?
                </label>
                <div className="mt-2">
                  <select
                    id="country"
                    name="country"
                    onChange={(e) => {
                      if (e.target.value === "Yes") setFirstSessionFree(true);
                      else setFirstSessionFree(false);
                    }}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                  >
                    <option value={"No"} selected={!firstSessionFree}>
                      No
                    </option>
                    <option value={"Yes"} selected={firstSessionFree}>
                      Yes
                    </option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  I also want to tutor in person
                </label>
                <div className="mt-2">
                  <select
                    id="country"
                    name="country"
                    onChange={(e) => {
                      if (e.target.value === "Yes") setTutorInPerson(true);
                      else setTutorInPerson(false);
                    }}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                  >
                    <option value={"No"} selected={!tutorInPerson}>
                      No
                    </option>
                    <option value={"Yes"} selected={tutorInPerson}>
                      Yes
                    </option>
                  </select>
                </div>
              </div>
              {tutorInPerson && (
                <>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="country"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Country
                    </label>
                    <div className="mt-2">
                      <select
                        id="country"
                        name="country"
                        onChange={(e) => setCountry(e.target.value)}
                        autoComplete="country-name"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                      >
                        <option selected>{country}</option>
                      </select>
                    </div>
                  </div>

                  {/* <div className="sm:col-span-2 sm:col-start-1">
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    City
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="city"
                      id="city"
                      autoComplete="address-level2"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div> */}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="region"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      State / Province
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="region"
                        id="region"
                        autoComplete="address-level1"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="postal-code"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      ZIP / Postal code
                    </label>
                    <div className="mt-2">
                      <input
                        type="number"
                        name="postal-code"
                        id="postal-code"
                        autoComplete="postal-code"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        value={zipCode != 0 ? zipCode : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            setZipCode(parseInt(e.target.value));
                          } else {
                            setZipCode(0);
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="col-span-full">
                <label
                  htmlFor="about"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Availability 
                </label>
                <div className="mt-2">
                  <textarea
                    id="about"
                    placeholder={`Monday: 3:00 P.M. - 5 P.M. & 8 P.M. - 11 P.M. \nTuesday: 10 A.M. - 3 P.M. \n...`}
                    name="about"
                    rows={3}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={availability || ""}
                    onChange={(e) => setAvailability(e.target.value)}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                Used by Pathway to create your calendar
                </p>

               
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="about"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Meeting Link 
                </label>
                <div className="mt-2">
                  <input
                    id="about"
                    placeholder={"Zoom, Google Meets, etc..."}
                    name="about"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={meetingLink ?? ""}
                    onChange={(e) => setMeetingLink(e.target.value)}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                Only needed if you plan on having online sessions
                </p>

               
              </div>
            </div>
          </div>

          <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base font-semibold leading-7 text-gray-900">
              Status
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              We will update you on when your status changes with the email you
              provided. <br></br>
              To update the email being used, go to the name and profile icon
              for the option to change. <br></br>
              Any change to your school, major, or GPA will require the
              restarting of the approval process.
            </p>

            <p className="mt-3">
              Current status:{" "}
              {approved ? (
                <span className="font-bold text-green-700">Approved</span>
              ) : (
                <span className="font-bold text-red-700">Not approved</span>
              )}
            </p>

            {/* <div className="mt-10 space-y-10">
            <fieldset>
              <legend className="text-sm font-semibold leading-6 text-gray-900">
                By Email
              </legend>
              <div className="mt-6 space-y-6">
                <div className="relative flex gap-x-3">
                  <div className="flex h-6 items-center">
                    <input
                      id="comments"
                      name="comments"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="text-sm leading-6">
                    <label
                      htmlFor="comments"
                      className="font-medium text-gray-900"
                    >
                      Comments
                    </label>
                    <p className="text-gray-500">
                      Get notified when someones posts a comment on a posting.
                    </p>
                  </div>
                </div>
                <div className="relative flex gap-x-3">
                  <div className="flex h-6 items-center">
                    <input
                      id="candidates"
                      name="candidates"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="text-sm leading-6">
                    <label
                      htmlFor="candidates"
                      className="font-medium text-gray-900"
                    >
                      Candidates
                    </label>
                    <p className="text-gray-500">
                      Get notified when a candidate applies for a job.
                    </p>
                  </div>
                </div>
                <div className="relative flex gap-x-3">
                  <div className="flex h-6 items-center">
                    <input
                      id="offers"
                      name="offers"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="text-sm leading-6">
                    <label
                      htmlFor="offers"
                      className="font-medium text-gray-900"
                    >
                      Offers
                    </label>
                    <p className="text-gray-500">
                      Get notified when a candidate accepts or rejects an offer.
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold leading-6 text-gray-900">
                Push Notifications
              </legend>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                These are delivered via SMS to your mobile phone.
              </p>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-x-3">
                  <input
                    id="push-everything"
                    name="push-notifications"
                    type="radio"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label
                    htmlFor="push-everything"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Everything
                  </label>
                </div>
                <div className="flex items-center gap-x-3">
                  <input
                    id="push-email"
                    name="push-notifications"
                    type="radio"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label
                    htmlFor="push-email"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Same as email
                  </label>
                </div>
                <div className="flex items-center gap-x-3">
                  <input
                    id="push-nothing"
                    name="push-notifications"
                    type="radio"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label
                    htmlFor="push-nothing"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    No push notifications
                  </label>
                </div>
              </div>
            </fieldset>
          </div> */}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <Link
            href={`/tutors/${tutor.data?.username}`}
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            Cancel
          </Link>
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            disabled={!user.user?.id}
            onClick={() => {
              updateUser.mutate({
                id: user.user!.id,
                bio,
                username: username as string,
                school: school == "Other" ? otherSchoolName : school,
                major: major == "Other" ? otherMajor : major,
                description,
                gpa,
                hourlyRate,
                country,
                state,
                zipCode,
                tutorInPerson,
                imageSrc: user.user?.imageUrl,
                firstName: user.user?.firstName ?? "None",
                lastName: user.user?.lastName ?? "None",
                subjects: seletedSubjects,
                meetingLink: meetingLink ?? undefined
              });
            }}
          >
            Update
          </button>
        </div>
      </div>
    );
  else {
    return (
      <button
        className=" m-24 flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        onClick={() => {
          createTutor.mutate({
            id: user.user!.id,
            firstName: user.user!.firstName ?? "None",
            lastName: user.user!.lastName ?? "None",
            imageSrc: user.user!.imageUrl ?? "",
          });
        }}
      >
        Create your user profile
      </button>
    );
  }
}
