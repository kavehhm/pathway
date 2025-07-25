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
import {
  Fragment,
  useState,
} from "react";
import { Dialog, Disclosure, Menu, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  FunnelIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import ProductList from "~/components/ProductList";
import { api } from "~/utils/api";
import Multiselect from "multiselect-react-dropdown";
import { FaMagnifyingGlass } from "react-icons/fa6";

const sortOptions = [
  { name: "Most Popular", href: "#", current: true },
  { name: "Best Rating", href: "#", current: false },
  { name: "Newest", href: "#", current: false },
  { name: "Price: Low to High", href: "#", current: false },
  { name: "Price: High to Low", href: "#", current: false },
];

const filters = [
  {
    id: "school",
    name: "School",
  },
  {
    id: "major",
    name: "Major",
  },
  {
    id: "subject",
    name: "Subject",
  },
  // {
  //   id: "size",
  //   name: "Size",

  // },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Example() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const schools = api.post.getAllSchools.useQuery();
  const majors = api.post.getAllMajors.useQuery();
  const subjects = api.post.getAllSubjects.useQuery();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const allSubs: string[] = [];
  const allMajors: string[] = [];
  const allSchools: string[] = [];

  console.log(subjects.data);
  subjects.data?.forEach((item: { subjects: any }) => {
    // Extract subjects from each object
    const subjects = item.subjects;

    // Iterate through subjects
    subjects.forEach((subject: any) => {
      // Add unique subjects to allUniqueSubjects
      if (!allSubs.includes(subject)) {
        allSubs.push(subject);
      }
    });
  });

  majors.data?.forEach((item) => {
    if (!allMajors.includes(item.major)) {
      allMajors.push(item.major);
    }
  });

  schools.data?.forEach((item) => {
    if (!allSchools.includes(item.school)) {
      allSchools.push(item.school);
    }
  });

  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [firstSessionFreeOnly, setFirstSessionFreeOnly] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");

  return (
    <div className="bg-white py-12 mt-16">
      <div>
        {/* Mobile filter dialog */}
        <Transition.Root show={mobileFiltersOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50 lg:hidden"
            onClose={setMobileFiltersOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 z-[80] flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="relative z-[80] ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl">
                  <div className="flex items-center justify-between px-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Filters
                    </h2>
                    <button
                      type="button"
                      className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Filters */}
                  <form className="mt-4 border-t border-gray-200">
                    {/* <h3 className="sr-only">Categories</h3>
                    <ul role="list" className="px-2 py-3 font-medium text-gray-900">
                      {subCategories.map((category) => (
                        <li key={category.name}>
                          <a href={category.href} className="block px-2 py-3">
                            {category.name}
                          </a>
                        </li>
                      ))}
                    </ul> */}

                    {filters.map((section) => (
                      <Disclosure
                        as="div"
                        key={section.id}
                        className="border-t border-gray-200 px-4 py-6"
                      >
                        {({ open }) => (
                          <>
                            <h3 className="-mx-2 -my-3 flow-root">
                              <Disclosure.Button className="flex w-full items-center justify-between bg-white px-2 py-3 text-gray-400 hover:text-gray-500">
                                <span className="font-medium text-gray-900">
                                  {section.name}
                                </span>
                                <span className="ml-6 flex items-center">
                                  {open ? (
                                    <MinusIcon
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <PlusIcon
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              </Disclosure.Button>
                            </h3>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  {section.name === "School" && (
                                    <Multiselect
                                      selectedValues={selectedSchools}
                                      isObject={false}
                                      options={allSchools}
                                      onRemove={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedSchools(selectedList);
                                      }}
                                      onSelect={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedSchools(selectedList);
                                      }}
                                    />
                                  )}

                                  {section.name === "Major" && (
                                    <Multiselect
                                      selectedValues={selectedMajors}
                                      isObject={false}
                                      options={allMajors}
                                      onRemove={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedMajors(selectedList);
                                      }}
                                      onSelect={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedMajors(selectedList);
                                      }}
                                    />
                                  )}

                                  {section.name === "Subject" && (
                                    <Multiselect
                                      selectedValues={selectedSubjects}
                                      isObject={false}
                                      options={allSubs}
                                      onRemove={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedSubjects(selectedList);
                                      }}
                                      onSelect={(
                                        selectedList,
                                        selectedItem,
                                      ) => {
                                        // selectedList.push(selectedItem)

                                        setSelectedSubjects(selectedList);
                                      }}
                                    />
                                  )}



                                  {/* {section.options.map((option, optionIdx) => (
                              <div
                                key={option.value}
                                className="flex items-center"
                              >
                                <input
                                  id={`filter-${section.id}-${optionIdx}`}
                                  name={`${section.id}[]`}
                                  defaultValue={option.value}
                                  type="checkbox"
                                  defaultChecked={option.checked}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label
                                  htmlFor={`filter-${section.id}-${optionIdx}`}
                                  className="ml-3 text-sm text-gray-600"
                                >
                                  {option.label}
                                </label>
                              </div>
                            ))} */}
                                </div>
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    ))}

                    {/* First Session Free Filter - Always Visible */}
                    <div className="border-t border-gray-200 px-4 py-6">
                      <div className="flex items-center">
                        <input
                          id="first-session-free-mobile"
                          name="first-session-free-mobile"
                          type="checkbox"
                          checked={firstSessionFreeOnly}
                          onChange={(e) => setFirstSessionFreeOnly(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label
                          htmlFor="first-session-free-mobile"
                          className="ml-3 text-sm font-medium text-gray-900"
                        >
                          Show only tutors with free first session
                        </label>
                      </div>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-gray-200 pb-6 pt-24">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Pathway Tutors
            </h1>
            <div className="flex w-2/3 rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
              <input
                type="text"
                name="username"
                id="username"
                className="block flex-1 border-0 bg-transparent py-1.5 pl-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                placeholder="John Doe"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="flex select-none items-center pr-3 text-gray-500 sm:text-sm">
                <FaMagnifyingGlass />
              </span>
            </div>
            {/* sort and squares */}
            <div className="flex items-center">
              {/* <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                    Sort
                    <ChevronDownIcon
                      className="-mr-1 ml-1 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                  </Menu.Button>
                </div>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {sortOptions.map((option) => (
                        <Menu.Item key={option.name}>
                          {({ active }) => (
                            <a
                              href={option.href}
                              className={classNames(
                                option.current
                                  ? "font-medium text-gray-900"
                                  : "text-gray-500",
                                active ? "bg-gray-100" : "",
                                "block px-4 py-2 text-sm",
                              )}
                            >
                              {option.name}
                            </a>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>

              <button
                type="button"
                className="-m-2 ml-5 p-2 text-gray-400 hover:text-gray-500 sm:ml-7"
              >
                <span className="sr-only">View grid</span>
                <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
              </button> */}
              <button
                type="button"
                className="-m-2 ml-4 p-2 text-gray-400 hover:text-gray-500 sm:ml-6 lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <span className="sr-only">Filters</span>
                <FunnelIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <section aria-labelledby="products-heading" className="pb-24 pt-6">
            <h2 id="products-heading" className="sr-only">
              Products
            </h2>

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4">
              {/* Filters */}
              <form className="hidden lg:block">
                {/* <h3 className="sr-only">Categories</h3>
                <ul role="list" className="space-y-4 border-b border-gray-200 pb-6 text-sm font-medium text-gray-900">
                  {subCategories.map((category) => (
                    <li key={category.name}>
                      <a href={category.href}>{category.name}</a>
                    </li>
                  ))}
                </ul> */}

                {filters.map((section) => (
                  <Disclosure
                    as="div"
                    key={section.id}
                    className="border-b border-gray-200 py-6"
                  >
                    {({ open }) => (
                      <>
                        <h3 className="-my-3 flow-root">
                          <Disclosure.Button className="flex w-full items-center justify-between bg-white py-3 text-sm text-gray-400 hover:text-gray-500">
                            <span className="font-medium text-gray-900">
                              {section.name}
                            </span>
                            <span className="ml-6 flex items-center">
                              {open ? (
                                <MinusIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <PlusIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          </Disclosure.Button>
                        </h3>
                        <Disclosure.Panel className="pt-6">
                          <div className="space-y-4">
                            {section.name === "School" && (
                              <Multiselect
                                selectedValues={selectedSchools}
                                isObject={false}
                                options={allSchools}
                                onRemove={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedSchools(selectedList);
                                }}
                                onSelect={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedSchools(selectedList);
                                }}
                              />
                            )}

                            {section.name === "Major" && (
                              <Multiselect
                                selectedValues={selectedMajors}
                                isObject={false}
                                options={allMajors}
                                onRemove={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedMajors(selectedList);
                                }}
                                onSelect={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedMajors(selectedList);
                                }}
                              />
                            )}

                            {section.name === "Subject" && (
                              <Multiselect
                                selectedValues={selectedSubjects}
                                isObject={false}
                                options={allSubs}
                                onRemove={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedSubjects(selectedList);
                                }}
                                onSelect={(selectedList, selectedItem) => {
                                  // selectedList.push(selectedItem)

                                  setSelectedSubjects(selectedList);
                                }}
                              />
                            )}



                            {/* {section.options.map((option, optionIdx) => (
                              <div
                                key={option.value}
                                className="flex items-center"
                              >
                                <input
                                  id={`filter-${section.id}-${optionIdx}`}
                                  name={`${section.id}[]`}
                                  defaultValue={option.value}
                                  type="checkbox"
                                  defaultChecked={option.checked}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label
                                  htmlFor={`filter-${section.id}-${optionIdx}`}
                                  className="ml-3 text-sm text-gray-600"
                                >
                                  {option.label}
                                </label>
                              </div>
                            ))} */}
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                ))}

                {/* First Session Free Filter - Always Visible */}
                <div className="border-b border-gray-200 py-6">
                  <div className="flex items-center">
                    <input
                      id="first-session-free-desktop"
                      name="first-session-free-desktop"
                      type="checkbox"
                      checked={firstSessionFreeOnly}
                      onChange={(e) => setFirstSessionFreeOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="first-session-free-desktop"
                      className="ml-3 text-sm font-medium text-gray-900"
                    >
                      Show only tutors with free first session
                    </label>
                  </div>
                </div>
              </form>

              {/* Product grid */}
              <div className="lg:col-span-3">
                <ProductList
                  selectedMajors={selectedMajors}
                  selectedSchools={selectedSchools}
                  selectedSubjects={selectedSubjects}
                  firstSessionFreeOnly={firstSessionFreeOnly}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
