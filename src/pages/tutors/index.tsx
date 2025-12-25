import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Dialog, Disclosure, Transition } from "@headlessui/react";
import { FunnelIcon, MinusIcon, PlusIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { FaMagnifyingGlass } from "react-icons/fa6";

import ProductList from "~/components/ProductList";
import NewNav from "~/components/NewNav";
import { api } from "~/utils/api";

const FILTER_SECTIONS = [
  { id: "school", name: "School" },
  { id: "major", name: "Major" },
  { id: "subject", name: "Subject" },
  { id: "course", name: "Course (Northwestern)" },
  { id: "price", name: "Price Range" },
];

const HERO_STATS = [
  { label: "Active mentors", value: "1,200+" },
  { label: "Top campuses", value: "90+" },
  { label: "Avg reply time", value: "< 12 hrs" },
];

// Custom multiselect component using portal
function PortalMultiselect({
  options,
  selectedValues,
  onSelect,
  onRemove,
  placeholder,
}: {
  options: string[];
  selectedValues: string[];
  onSelect: (items: string[]) => void;
  onRemove: (items: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    return options.filter(
      (option) =>
        option.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedValues.includes(option)
    );
  }, [options, searchQuery, selectedValues]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onSelect([...selectedValues, option]);
    setSearchQuery("");
  };

  const handleRemove = (option: string) => {
    onRemove(selectedValues.filter((v) => v !== option));
  };

  const dropdownContent = isOpen && anchorRef.current && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: anchorRef.current.getBoundingClientRect().bottom + window.scrollY + 4,
        left: anchorRef.current.getBoundingClientRect().left + window.scrollX,
        width: anchorRef.current.getBoundingClientRect().width,
        zIndex: 99999,
      }}
      className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <div
            key={option}
            onClick={() => handleSelect(option)}
            className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition hover:bg-violet-50"
          >
            {option}
          </div>
        ))
      ) : (
        <div className="px-4 py-2.5 text-sm text-slate-400">No options found</div>
      )}
    </div>
  );

  return (
    <div ref={anchorRef} className="relative">
      <div className="min-h-[38px] rounded-2xl bg-white">
        <div className="flex flex-wrap gap-1.5 p-1">
          {selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white"
            >
              {value}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(value);
                }}
                className="hover:text-violet-200"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedValues.length === 0 ? placeholder : ""}
            className="min-w-[120px] flex-1 border-0 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2 text-slate-400 hover:text-slate-600"
          >
            ▼
          </button>
        </div>
      </div>
      {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}

const TutorFilters = ({
  availableSchools,
  availableMajors,
  availableSubjects,
  availableCourses,
  selectedSchools,
  selectedMajors,
  selectedSubjects,
  selectedCourseIds,
  setSelectedSchools,
  setSelectedMajors,
  setSelectedSubjects,
  setSelectedCourseIds,
  firstSessionFreeOnly,
  setFirstSessionFreeOnly,
  priceRange,
  setPriceRange,
  onReset,
}: {
  availableSchools: string[];
  availableMajors: string[];
  availableSubjects: string[];
  availableCourses: Array<{ id: string; courseId: string; courseName: string }>;
  selectedSchools: string[];
  selectedMajors: string[];
  selectedSubjects: string[];
  selectedCourseIds: string[];
  setSelectedSchools: (items: string[]) => void;
  setSelectedMajors: (items: string[]) => void;
  setSelectedSubjects: (items: string[]) => void;
  setSelectedCourseIds: (items: string[]) => void;
  firstSessionFreeOnly: boolean;
  setFirstSessionFreeOnly: (value: boolean) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  onReset: () => void;
}) => {
  const renderMultiselect = (sectionName: string) => {
    const wrapperClass =
      "rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100";

    if (sectionName === "School") {
      return (
        <div className={wrapperClass}>
          <PortalMultiselect
            placeholder="Select schools"
            selectedValues={selectedSchools}
            options={availableSchools}
            onRemove={(selectedList) => setSelectedSchools(selectedList)}
            onSelect={(selectedList) => setSelectedSchools(selectedList)}
          />
        </div>
      );
    }
    if (sectionName === "Major") {
      return (
        <div className={wrapperClass}>
          <PortalMultiselect
            placeholder="Select majors"
            selectedValues={selectedMajors}
            options={availableMajors}
            onRemove={(selectedList) => setSelectedMajors(selectedList)}
            onSelect={(selectedList) => setSelectedMajors(selectedList)}
          />
        </div>
      );
    }
    if (sectionName === "Course (Northwestern)") {
      // Show only if Northwestern is selected
      if (selectedSchools.includes("Northwestern University")) {
        return (
          <div className={wrapperClass}>
            <PortalMultiselect
              placeholder="Search Northwestern courses"
              selectedValues={selectedCourseIds.map(id => {
                const course = availableCourses.find(c => c.id === id);
                return course ? `${course.courseId} - ${course.courseName}` : id;
              })}
              options={availableCourses.map(c => `${c.courseId} - ${c.courseName}`)}
              onRemove={(selectedList) => {
                const ids = selectedList.map(label => {
                  const course = availableCourses.find(c => `${c.courseId} - ${c.courseName}` === label);
                  return course?.id ?? label;
                });
                setSelectedCourseIds(ids);
              }}
              onSelect={(selectedList) => {
                const ids = selectedList.map(label => {
                  const course = availableCourses.find(c => `${c.courseId} - ${c.courseName}` === label);
                  return course?.id ?? label;
                });
                setSelectedCourseIds(ids);
              }}
            />
          </div>
        );
      }
      return null;
    }
    if (sectionName === "Price Range") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              ${priceRange[0]} - {priceRange[1] >= 100 ? "$100+" : `$${priceRange[1]}`}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-600 mb-2">Minimum</label>
              <input
                type="range"
                min="0"
                max="100"
                value={priceRange[0]}
                onChange={(e) => {
                  const newMin = Number(e.target.value);
                  if (newMin <= priceRange[1]) {
                    setPriceRange([newMin, priceRange[1]]);
                  }
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-2">Maximum</label>
              <input
                type="range"
                min="0"
                max="100"
                value={priceRange[1]}
                onChange={(e) => {
                  const newMax = Number(e.target.value);
                  if (newMax >= priceRange[0]) {
                    setPriceRange([priceRange[0], newMax]);
                  }
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={wrapperClass}>
        <PortalMultiselect
          placeholder="Select subjects"
          selectedValues={selectedSubjects}
          options={availableSubjects}
          onRemove={(selectedList) => setSelectedSubjects(selectedList)}
          onSelect={(selectedList) => setSelectedSubjects(selectedList)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {FILTER_SECTIONS.map((section) => (
        <Disclosure
          as="div"
          key={section.id}
          className="overflow-visible rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur"
        >
          {({ open }) => (
            <>
              <Disclosure.Button className="flex w-full items-center justify-between text-left">
                <span className="text-sm font-semibold text-slate-700">
                  {section.name}
                </span>
                {open ? (
                  <MinusIcon className="h-5 w-5 text-slate-400" />
                ) : (
                  <PlusIcon className="h-5 w-5 text-slate-400" />
                )}
              </Disclosure.Button>
              <Disclosure.Panel className="mt-4">
                {renderMultiselect(section.name)}
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      ))}

      <label className="flex items-center justify-between rounded-3xl border border-white/70 bg-white/75 p-4 text-sm shadow-sm backdrop-blur">
        <span className="flex flex-col gap-1">
          <span className="font-semibold text-slate-700">
            First session free
          </span>
          <span className="text-xs text-slate-500">
            Only show mentors offering a no-risk intro
          </span>
        </span>
        <input
          type="checkbox"
          checked={firstSessionFreeOnly}
          onChange={(event) => setFirstSessionFreeOnly(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-full border border-violet-200 bg-white py-2.5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
      >
        Reset filters
      </button>
    </div>
  );
};

const TutorSearchBar = ({
  searchQuery,
  setSearchQuery,
  onOpenFilters,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onOpenFilters: () => void;
}) => (
  <form
    className="mt-10 flex flex-col gap-4 md:flex-row md:items-center"
    onSubmit={(event) => event.preventDefault()}
  >
    <div className="relative flex w-full items-center rounded-full border-2 border-slate-300 bg-white px-4 py-3 text-sm shadow-md backdrop-blur focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-200">
      <FaMagnifyingGlass className="mr-3 text-slate-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search tutors by name or username"
        className="w-full border-0 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
    <button
      type="button"
      onClick={onOpenFilters}
      className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 md:hidden"
    >
      <FunnelIcon className="mr-2 h-4 w-4" />
      Filters
    </button>
  </form>
);

export default function TutorsPage() {
  const router = useRouter();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const schoolsQuery = api.post.getAllSchools.useQuery();
  const majorsQuery = api.post.getAllMajors.useQuery();
  const subjectsQuery = api.post.getAllSubjects.useQuery();

  const availableSchools = useMemo(() => {
    const unique = new Set<string>();
    schoolsQuery.data?.forEach((item) => {
      if (item.school) {
        unique.add(item.school);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [schoolsQuery.data]);

  const availableMajors = useMemo(() => {
    const unique = new Set<string>();
    majorsQuery.data?.forEach((item) => {
      if (item.major) {
        unique.add(item.major);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [majorsQuery.data]);

  const availableSubjects = useMemo(() => {
    const unique = new Set<string>();
    subjectsQuery.data?.forEach((item) => {
      if (Array.isArray(item.subjects)) {
        item.subjects.forEach((subject) => {
          if (typeof subject === "string") {
            unique.add(subject);
          }
        });
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [subjectsQuery.data]);

  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [firstSessionFreeOnly, setFirstSessionFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  
  // Query for Northwestern courses from database
  const northwesternCoursesQuery = api.post.getCoursesBySchool.useQuery(
    { school: "Northwestern University" },
    { enabled: selectedSchools.includes("Northwestern University") }
  );

  const initializedFromQuery = useRef(false);

  // Load Northwestern courses - TEMPORARILY COMMENTED OUT
  // useEffect(() => {
  //   const loadCourses = async () => {
  //     try {
  //       const response = await fetch('/course catalogs/northwestern_undergrad_courses_ALL.csv');
  //       const text = await response.text();
  //       const lines = text.split('\n');
  //       const parsed: string[] = [];
  //       
  //       for (let i = 1; i < lines.length; i++) {
  //         const line = lines[i]?.trim();
  //         if (line) {
  //           const [course_id, course_name] = line.split(',');
  //           if (course_id && course_name) {
  //             const cleanName = course_name.trim().replace(/^"|"$/g, '');
  //             parsed.push(`${course_id.trim()} - ${cleanName}`);
  //           }
  //         }
  //       }
  //       
  //       setNorthwesternCourses(parsed);
  //     } catch (error) {
  //       console.error('Failed to load Northwestern courses:', error);
  //     }
  //   };
  //   
  //   loadCourses();
  // }, []);

  useEffect(() => {
    if (!router.isReady || initializedFromQuery.current) return;

    const parseParam = (value: string | string[] | undefined) => {
      if (!value) return [];
      return Array.isArray(value)
        ? value
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [value.trim()].filter(Boolean);
    };

    const schoolParams = parseParam(router.query.school);
    const majorParams = parseParam(router.query.major);
    const courseParams = parseParam(router.query.course);
    const queryParam =
      typeof router.query.q === "string" ? router.query.q.trim() : "";

    if (schoolParams.length > 0) {
      setSelectedSchools(schoolParams);
    }
    if (majorParams.length > 0) {
      setSelectedMajors(majorParams);
    }
    if (courseParams.length > 0) {
      // Convert course strings to UUIDs if they're in "COURSE_ID - Course Name" format
      if (northwesternCoursesQuery.data) {
        const courseIds = courseParams.map(courseParam => {
          // Check if it's already a UUID (from filter dropdown)
          const existingCourse = northwesternCoursesQuery.data.find(c => c.id === courseParam);
          if (existingCourse) return courseParam;
          
          // Otherwise, it's from the landing page in "COURSE_ID - Course Name" format
          const course = northwesternCoursesQuery.data.find(c => 
            `${c.courseId} - ${c.courseName}` === courseParam
          );
          return course?.id ?? courseParam;
        }).filter(Boolean);
        setSelectedCourseIds(courseIds);
      } else {
        // If courses aren't loaded yet, just set the raw params (will be converted when courses load)
        setSelectedCourseIds(courseParams);
      }
    }
    if (queryParam) {
      setSearchQuery(queryParam);
    }

    initializedFromQuery.current = true;
  }, [router.isReady, router.query, northwesternCoursesQuery.data]);

  const persona =
    typeof router.query.role === "string" ? router.query.role : undefined;
  const personaLabel =
    persona === "aspiring"
      ? "College applicant"
      : persona === "enrolled"
      ? "Course search"
      : "Guided matching";
  const personaCopy =
    persona === "aspiring"
      ? "Work with mentors who already earned admission and will help you craft a standout application."
      : persona === "enrolled"
      ? "Find tutors who already aced the exact exams, labs, and projects you're tackling now at Northwestern."
      : "Match with tutors who share your campus, major, and course experience.";

  const resetFilters = () => {
    setSelectedSchools([]);
    setSelectedMajors([]);
    setSelectedSubjects([]);
    setSelectedCourseIds([]);
    setFirstSessionFreeOnly(false);
    setPriceRange([0, 100]);
  };

  return (
    <div className="pb-28 pt-8">
        <Transition.Root show={mobileFiltersOpen} as={Fragment}>
          <Dialog
            as="div"
          className="relative z-40 lg:hidden"
            onClose={setMobileFiltersOpen}
          >
            <Transition.Child
              as={Fragment}
            enter="transition-opacity ease-linear duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
            </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
              <Dialog.Panel className="ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto border-l border-white/40 bg-white/90 p-6 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-base font-semibold text-slate-700">
                      Filters
                  </Dialog.Title>
                    <button
                      type="button"
                    className="rounded-full border border-slate-200 p-2 text-slate-400 hover:text-slate-600"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      <span className="sr-only">Close menu</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                <div className="mt-6">
                  <TutorFilters
                    availableSchools={availableSchools}
                    availableMajors={availableMajors}
                    availableSubjects={availableSubjects}
                    availableCourses={northwesternCoursesQuery.data ?? []}
                    selectedSchools={selectedSchools}
                    selectedMajors={selectedMajors}
                    selectedSubjects={selectedSubjects}
                    selectedCourseIds={selectedCourseIds}
                    setSelectedSchools={setSelectedSchools}
                    setSelectedMajors={setSelectedMajors}
                    setSelectedSubjects={setSelectedSubjects}
                    setSelectedCourseIds={setSelectedCourseIds}
                    firstSessionFreeOnly={firstSessionFreeOnly}
                    setFirstSessionFreeOnly={setFirstSessionFreeOnly}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onReset={() => {
                      resetFilters();
                      setMobileFiltersOpen(false);
                    }}
                  />
                    </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="relative z-10 rounded-[2.5rem] border-2 border-slate-200 bg-white/90 px-8 py-12 shadow-xl backdrop-blur">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1 text-xs font-semibold text-violet-700">
              {personaLabel}
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Find the tutor who already thrives where you want to succeed
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-600">
              {personaCopy}
            </p>
                </div>

          <TutorSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenFilters={() => setMobileFiltersOpen(true)}
          />

          {(selectedSchools.length > 0 ||
            selectedMajors.length > 0 ||
            selectedSubjects.length > 0 ||
            firstSessionFreeOnly ||
            priceRange[0] > 0 ||
            priceRange[1] < 100) && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Active filters:</span>
              {selectedSchools.map((school) => (
                <span
                  key={`school-${school}`}
                  className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700"
                >
                  {school}
                </span>
              ))}
              {selectedMajors.map((major) => (
                <span
                  key={`major-${major}`}
                  className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700"
                >
                  {major}
                </span>
              ))}
              {selectedSubjects.map((subject) => (
                <span
                  key={`subject-${subject}`}
                  className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700"
                >
                  {subject}
                </span>
              ))}
              {firstSessionFreeOnly && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                  First session free
                </span>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 100) && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                  ${priceRange[0]} - {priceRange[1] >= 100 ? "$100+" : `$${priceRange[1]}`}
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 text-sm font-semibold text-violet-700 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </header>

        <section className="mt-16 grid gap-12 lg:grid-cols-[320px,1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-[2.25rem] border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-800">
                  Refine your match
            </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter by campus, major, subject, or intro offers to pinpoint
                  the right mentor.
                </p>
                <div className="mt-6">
                  <TutorFilters
                    availableSchools={availableSchools}
                    availableMajors={availableMajors}
                    availableSubjects={availableSubjects}
                    availableCourses={northwesternCoursesQuery.data ?? []}
                    selectedSchools={selectedSchools}
                    selectedMajors={selectedMajors}
                    selectedSubjects={selectedSubjects}
                    selectedCourseIds={selectedCourseIds}
                    setSelectedSchools={setSelectedSchools}
                    setSelectedMajors={setSelectedMajors}
                    setSelectedSubjects={setSelectedSubjects}
                    setSelectedCourseIds={setSelectedCourseIds}
                    firstSessionFreeOnly={firstSessionFreeOnly}
                    setFirstSessionFreeOnly={setFirstSessionFreeOnly}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onReset={resetFilters}
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="rounded-[2.5rem] border border-white/70 bg-white/75 p-6 shadow-xl backdrop-blur">
                <ProductList
                  selectedMajors={selectedMajors}
                  selectedSchools={selectedSchools}
                  selectedSubjects={selectedSubjects}
                  selectedCourses={selectedCourseIds}
                  firstSessionFreeOnly={firstSessionFreeOnly}
                  searchQuery={searchQuery}
                  minPrice={priceRange[0]}
                  maxPrice={priceRange[1]}
                />
            </div>
          </section>
        </main>
    </div>
  );
}
