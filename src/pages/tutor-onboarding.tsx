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
import Multiselect from "multiselect-react-dropdown";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast, { LoaderIcon } from "react-hot-toast";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import schools from "~/schools";
import majors from "~/majors";
import subjectList from "~/subjectOptions";
import { AiOutlineExclamationCircle } from "react-icons/ai";
import { TimePicker } from "antd";
import { MdOutlineCancel } from "react-icons/md";
import { CiCirclePlus } from "react-icons/ci";
import { US_TIMEZONES } from "~/utils/timezones";
import StripeConnectSetup from "~/components/StripeConnectSetup";
import dayjs from 'dayjs';

const BIO_LENGTH = 250;

type Availability = {
  day: string;
  startTime: Date | undefined | null;
  endTime: Date | undefined | null;
  visible: boolean;
  available: boolean;
  timeRange: string | null;
};

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
  // const [availability, setAvailability] = useState("");
  const [otherSchoolName, setOtherSchoolName] = useState("");
  const [otherMajor, setOtherMajor] = useState("");
  const [meetingLink, setMeetingLink] = useState(tutor.data?.meetingLink);
  const [timezone, setTimezone] = useState('PST');

  const [editAvailability, setEditAvailability] = useState(false);

  const [availability, setAvailability] = useState<Availability[]>([
    {
      day: "Sunday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Monday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Tuesday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Wednesday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Thursday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Friday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
    {
      day: "Saturday",
      startTime: undefined,
      endTime: undefined,
      visible: true,
      available: false,
      timeRange: "",
    },
  ]);

  // Add a cache to store sub time slots for each day when toggled unavailable
  const [subSlotCache, setSubSlotCache] = useState<Record<string, Availability[]>>({});

  const handleAddTimeWindow = (day: string, oldIndex: number) => {
    const defaultSlot: Availability = {
      day: day,
      visible: false,
      startTime: undefined,
      endTime: undefined,
      available: false,
      timeRange: '',
    };
    const old = availability[oldIndex] ?? defaultSlot;
    const newEntry: Availability = {
      day: old.day ?? day ?? '',
      visible: false,
      startTime: old.startTime === null ? undefined : old.startTime,
      endTime: old.endTime === null ? undefined : old.endTime,
      available: typeof old.available === 'boolean' ? old.available : false,
      timeRange: typeof old.timeRange === 'string' ? old.timeRange : '',
    };

    // Find the index of the last occurrence of the specified day
    const lastIndex = availability
      .map((entry, index) => (entry.day === day ? index : -1))
      .filter((index) => index !== -1)
      .pop();

    let updatedAvailability: Availability[] = [];
    if (typeof lastIndex === 'number' && lastIndex >= 0) {
      updatedAvailability = [
        ...availability.slice(0, lastIndex + 1),
        newEntry,
        ...availability.slice(lastIndex + 1),
      ];
    } else {
      updatedAvailability = [
        ...availability.slice(0, oldIndex + 1),
        newEntry,
        ...availability.slice(oldIndex + 1),
      ];
    }

    setAvailability(updatedAvailability);
  };

  const handleRemoveTimeWindow = (index: number) => {
    setAvailability((prev) => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      // If this is a sub slot, also remove it from the cache
      if (removed && !removed.visible) {
        setSubSlotCache((cache) => {
          const day = removed.day || '';
          if (!day) return cache;
          const filtered = (cache[day] ?? []).filter(
            (slot) => (slot.startTime === undefined ? undefined : slot.startTime) !== (removed.startTime === undefined ? undefined : removed.startTime) || (slot.endTime === undefined ? undefined : slot.endTime) !== (removed.endTime === undefined ? undefined : removed.endTime)
          );
          return { ...cache, [day]: filtered };
        });
      }
      return updated;
    });
  };

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
    setMeetingLink(tutor.data?.meetingLink);
    // Only set timezone if it exists on tutor.data
    if ('timezone' in (tutor.data ?? {})) {
      setTimezone((tutor.data as any)?.timezone ?? 'PST');
    } else {
      setTimezone('PST');
    }
    if (
      tutor.data?.availability &&
      tutor.data?.availability.length > 0 &&
      Array.isArray(tutor.data.availability)
    ) {
      setAvailability(tutor.data.availability);
    }
  }, [tutor.isFetchedAfterMount, tutor.data]);

  // Handle Stripe return and refresh account status
  useEffect(() => {
    const { success, refresh } = router.query;
    
    if (success === 'true' || refresh === 'true') {
      // Refresh the tutor data to get updated Stripe account status
      tutor.refetch();
      
      if (success === 'true') {
        toast.success('Payment account setup completed successfully!');
      }
      
      // Clean up the URL parameters
      router.replace('/tutor-onboarding', undefined, { shallow: true });
    }
  }, [router.query, tutor, router]);

  const handleAvailabilityChange = (
    index: number,
    value: string,
    field: "available" | "timeRange",
    startDate: Date | undefined,
    endDate: Date | undefined,
    dayToUpdate: string | undefined
  ) => {
    setAvailability((prev) => {
      // clone everything
      const next = prev.map((e) => ({ ...e }));

      if (field === "available" && dayToUpdate) {
        const isAvail = value === "YES";
        // Find all sub slots for this day (not visible)
        const subSlots = next.filter((e) => e.day === dayToUpdate && !e.visible);
        // Remove all sub slots for this day
        let filtered = next.filter((e) => e.day !== dayToUpdate || e.visible);
        filtered = filtered.map((e) =>
          e.day === dayToUpdate ? { ...e, available: isAvail } : e
        );
        // If toggling to unavailable, cache the sub slots
        if (!isAvail && subSlots.length > 0) {
          // Only cache sub slots that are currently present (not deleted)
          setSubSlotCache((cache) => ({ ...cache, [dayToUpdate]: subSlots }));
        }
        // If toggling to available and we have cached sub slots, restore them immediately after the main day
        if (isAvail && subSlotCache[dayToUpdate]) {
          const mainIndex = filtered.findIndex(e => e.day === dayToUpdate && e.visible);
          if (mainIndex !== -1) {
            filtered = [
              ...filtered.slice(0, mainIndex + 1),
              ...subSlotCache[dayToUpdate]!,
              ...filtered.slice(mainIndex + 1)
            ];
          } else {
            filtered = [
              ...filtered,
              ...subSlotCache[dayToUpdate]!
            ];
          }
        }
        return filtered;
      }

      if (field === "timeRange") {
        // guard against out‑of‑bounds
        const item = next[index];
        if (item) {
          item.timeRange = value;
          item.startTime = startDate === null ? undefined : startDate;
          item.endTime   = endDate === null ? undefined : endDate;
        }
      }

      return next;
    });
  };
  



  console.log("availabilty", availability);

  const updateUser = api.post.updateTutor.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated");
      await router.replace(`/tutors/${tutor.data?.username}`);
    },
  });

  if (tutor.data && tutor.isFetchedAfterMount)
    return (
      <div className="min-h-screen  bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="mx-auto pt-48 max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12  text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Complete Your Profile
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Let&apos;s get you set up to start tutoring on Pathway
            </p>
          </div>

          <div className="space-y-16">
            {/* Profile Section */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-xl border border-white/20 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Profile Information
                  </h2>
                  <p className="text-gray-600">
                    This information will be displayed publicly so be careful what you share.
                  </p>
                </div>
              </div>

                          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label
                  htmlFor="photo"
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Username{" "}
                  {!username && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                    <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">
                      pathwaytutors.com/tutors/
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Hourly Rate ($)
                  {!hourlyRate && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Bio
                  {!bio && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  About
                  {!description && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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

            {/* Personal Information Section */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-xl border border-white/20 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Personal Information
                  </h2>
                  <p className="text-gray-600">
                    This is the information that you will be matched with students based on
                  </p>
                </div>
              </div>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label
                  htmlFor="country"
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Schooling
                  {!school && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Major
                  {!major && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  GPA
                  {!gpa && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Subjects
                  {seletedSubjects?.length == 0 && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  First session free?
                  {firstSessionFree == null && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  I also want to tutor in person
                  {tutorInPerson == null && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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
                      className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                    >
                      Country
                      {!country && (
                        <AiOutlineExclamationCircle className="text-red-600" />
                      )}
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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                      className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                    >
                      State / Province
                      {!state && (
                        <AiOutlineExclamationCircle className="text-red-600" />
                      )}
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
                      className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                    >
                      ZIP / Postal code
                      {!zipCode && (
                        <AiOutlineExclamationCircle className="text-red-600" />
                      )}
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-lg font-semibold text-gray-900">
                      Weekly Availability
                    </label>
                    <p className="text-sm text-gray-600">Set your available hours for tutoring sessions</p>
                  </div>
                  {!(
                    tutor.data?.availability &&
                    tutor.data?.availability.length > 0 &&
                    Array.isArray(tutor.data.availability)
                  ) && <AiOutlineExclamationCircle className="text-red-600 text-xl" />}
                </div>

                <div className="space-y-6">
                  {availability.map((day, index) => {
                    // Only show sub time slots (invisible/secondary) if the day is available
                    if (!day.visible && !day.available) return null;
                    if (!day.visible && !availability.find(d => d.day === day.day && d.visible && d.available)) return null;
                    return (
                      <div
                        key={index}
                        className={`rounded-xl border-2 transition-all duration-200 ${
                          day.available 
                            ? 'border-blue-200 bg-blue-50/50' 
                            : 'border-gray-200 bg-gray-50/30'
                        } ${day.visible ? 'p-6' : 'p-4 ml-8'}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              day.available ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <span className={`text-sm font-semibold ${
                                day.available ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {day.day.slice(0, 3)}
                              </span>
                            </div>
                            <label className="text-lg font-medium text-gray-900">{day.day}</label>
                          </div>
                          {day.visible && (
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={day.available}
                                onChange={(e) => {
                                  handleAvailabilityChange(
                                    index,
                                    e.target.checked ? "YES" : "NO",
                                    "available",
                                    undefined,
                                    undefined,
                                    day.day
                                  );
                                }}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 transition-colors duration-200"
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {day.available ? 'Available' : 'Unavailable'}
                              </span>
                            </label>
                          )}
                        </div>
                        {day.available && (
                          <div className={`flex ${!day.visible && `col-start-3`} items-center gap-4`}>
                            <div className="flex-1 relative">
                              <TimePicker.RangePicker
                                placeholder={["Start Time", "End Time"]}
                                needConfirm={false}
                                className="w-full"
                                minuteStep={15}
                                format={"h:mm a"}
                                onCalendarChange={(dates, dateStrings) => {
                                  // unpack what the user picked (might be only start, only end, or both)
                                  const [pickedStart, pickedEnd] = dates;
                                  const [strStart, strEnd] = dateStrings;

                                  // decide what the new times should be
                                  const newStart = pickedStart?.toDate()   ?? day.startTime;
                                  const newEnd   = pickedEnd?.toDate()     ?? day.endTime;

                                  // build a display string, falling back to the old one if unchanged
                                  const displayStart = strStart || (day.startTime ? dayjs(day.startTime).format("h:mm a") : "");
                                  const displayEnd   = strEnd   || (day.endTime   ? dayjs(day.endTime).format("h:mm a")   : "");

                                  const safeStart = newStart === null ? undefined : newStart;
                                  const safeEnd = newEnd === null ? undefined : newEnd;
                                  handleAvailabilityChange(
                                    index,
                                    `${displayStart} - ${displayEnd}`,
                                    "timeRange",
                                    safeStart,
                                    safeEnd,
                                    day.day
                                  );
                                }}
                                value={[
                                  day.startTime ? dayjs(day.startTime) : null,
                                  day.endTime   ? dayjs(day.endTime)   : null
                                ]}
                                allowClear={true}
                              />
                            </div>
                            {day.visible ? (
                              <div className="flex flex-col items-center">
                                <button
                                  onClick={() => handleAddTimeWindow(day.day, index)}
                                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 shadow-md"
                                  title="Add another time slot"
                                >
                                  <CiCirclePlus className="text-2xl text-white" />
                                </button>
                                <span className="text-xs text-blue-700 mt-1">Add time slot</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRemoveTimeWindow(index)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 hover:bg-red-200 transition-colors duration-200"
                                title="Remove this time slot"
                              >
                                <MdOutlineCancel className="text-2xl text-red-600" />
                              </button>
                            )}
                          </div>
                        )}
                        {day.visible && <p className="text-xs text-gray-500 mt-2 ml-2">You can add multiple time slots for this day.</p>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <p className="text-sm text-blue-800">
                      Used by Pathway to create your calendar and match you with students during your available hours.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-full">
                <label
                  htmlFor="about"
                  className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                >
                  Meeting Link
                  {!meetingLink && (
                    <AiOutlineExclamationCircle className="text-red-600" />
                  )}
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

              <div className="col-span-full">
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Timezone
                </label>
                <div className="mt-2">
                  <select
                    id="timezone"
                    name="timezone"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {US_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Your timezone will be used to display your availability to students
                </p>
              </div>
            </div>
          </div>

            {/* Status Section */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-xl border border-white/20 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Account Status
                  </h2>
                  <p className="text-gray-600">
                    We will update you on when your status changes with the email you provided.
                  </p>
                </div>
              </div>

              <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${approved ? 'bg-green-100' : 'bg-red-100'}`}>
                    {approved ? (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current status:</p>
                    <p className={`font-bold ${approved ? 'text-green-700' : 'text-red-700'}`}>
                      {approved ? 'Approved' : 'Not approved'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>• To update the email being used, go to the name and profile icon for the option to change.</p>
                <p>• Any change to your school, major, or GPA will require the restarting of the approval process.</p>
              </div>

            {/* Stripe Connect Setup Section */}
            <div className="mt-10 border-t border-gray-900/10 pt-10">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Payment Setup
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Setup your payment account to receive payments from students. You will receive 80% of each session payment.
              </p>
              
              <div className="mt-6">
                <StripeConnectSetup />
              </div>
            </div>

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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
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
                    className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900"
                  >
                    No push notifications
                  </label>
                </div>
              </div>
            </fieldset>
          </div> */}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex items-center justify-end gap-x-6">
          <Link
            href={`/tutors/${tutor.data?.username}`}
            className="rounded-lg px-6 py-3 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            Cancel
          </Link>
          <button
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
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
                hourlyRate: (hourlyRate as number) < 0 ? 0 : hourlyRate,
                country,
                state,
                zipCode,
                tutorInPerson,
                imageSrc: user.user?.imageUrl,
                firstName: user.user?.firstName ?? "None",
                lastName: user.user?.lastName ?? "None",
                subjects: seletedSubjects,
                meetingLink: meetingLink ?? undefined,
                timezone,
                availability,
              });
            }}
          >
            Update Profile
          </button>
        </div>
      </div>
    );
  else if(tutor.isLoading)
  {
    return <LoaderIcon style={{width: '100px', height: '100px', marginTop: '5rem', marginLeft: '5rem'}} />
  }
  // Remove the 'create your user profile' button for signed-in users
  return null;
}
