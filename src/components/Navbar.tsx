import { useClerk, UserButton, useSession, useUser } from "@clerk/nextjs";
import { Dialog } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import React, { useState } from "react";
import { LoaderIcon } from "react-hot-toast";
import { api } from "~/utils/api";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openSignIn } = useClerk();
  const user = useUser();
  const { session } = useSession();
  const tutor = api.post.getTutor.useQuery(user.user?.id ?? "");
  const createTutor = api.post.createTutor.useMutation({
    onSuccess: async () => {
      await tutor.refetch();
    },
  });

  const navigation = [{ name: "Tutors", href: "/tutors" }];

  return (
    <header className="absolute inset-x-0  top-0 z-10 ">
      <nav
        className="flex items-center justify-between p-6 md:px-8"
        aria-label="Global"
      >
        <div className="flex md:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Your Company</span>
            <p className="font-extrabold">P</p>
          </Link>
        </div>
        <div className="flex md:hidden">
          {!mobileMenuOpen && (
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="hidden md:flex md:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-gray-900 underline-offset-4 hover:underline"
            >
              {item.name}
            </Link>
          ))}
          {session?.status == "active" && (
            <>
              {tutor.isFetchedAfterMount ? (
                <div className="text-sm font-semibold leading-6  text-gray-900 underline-offset-4 hover:underline">
                  {tutor.data ? (
                    <Link href={`/tutors/${tutor.data.username}`}>
                      View your profile
                    </Link>
                  ) : (
                    <button
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
                  )}
                </div>
              ) : (
                <LoaderIcon />
              )}
            </>
          )}
        </div>
        <div className="hidden md:flex md:flex-1 md:justify-end">
          {session?.status === "active" ? (
            <UserButton
              userProfileMode="navigation"
              userProfileUrl={tutor && "/tutor-onboarding"}
              afterSignOutUrl="/"
            />
          ) : (
            <button
              onClick={() => openSignIn()}
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Become a tutor <span aria-hidden="true">&rarr;</span>
            </button>
          )}
        </div>
      </nav>
      <Dialog
        as="div"
        className="md:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-10" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Your Company</span>
              <p className="font-extrabolld">P</p>
            </Link>
            <button
              type="button"
              className="-m-2.5 cursor-pointer rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="-mx-3 block rounded-lg px-3  py-2 text-base font-semibold leading-7 text-gray-900 underline-offset-4 hover:bg-gray-50 hover:underline"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              {session?.status == "active" && (
                <>
                  {tutor.isFetchedAfterMount ? (
                    <div className="-mx-3 block rounded-lg px-3  py-2 text-base font-semibold leading-7 text-gray-900 underline-offset-4 hover:bg-gray-50 hover:underline">
                      {tutor.data ? (
                        <Link
                          onClick={() => setMobileMenuOpen(false)}
                          href={`/tutors/${tutor.data.username}`}
                        >
                          View your profile
                        </Link>
                      ) : (
                        <button
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
                      )}
                    </div>
                  ) : (
                    <LoaderIcon />
                  )}
                </>
              )}
              <div className="py-6">
                {session?.status === "active" ? (
                  <UserButton
                    userProfileMode="navigation"
                    userProfileUrl={tutor && "/tutor-onboarding"}
                    afterSignOutUrl="/"
                  />
                ) : (
                  <button
                    onClick={() => openSignIn()}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Become a tutor <span aria-hidden="true">&rarr;</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
};

export default Navbar;
