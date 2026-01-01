import { useClerk, useSession, useUser } from "@clerk/nextjs";
import { Dialog } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { LoaderIcon } from "react-hot-toast";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import "aos/dist/aos.css";
import AOS from "aos";
import ourlogo from '../../public/ourlogo.png'
import CustomUserMenu from './CustomUserMenu';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openSignIn, openSignUp } = useClerk();
  const user = useUser();
  const { session } = useSession();
  const router = useRouter();
  const tutor = api.post.getTutor.useQuery(user.user?.id ?? "");
  const [hasRedirected, setHasRedirected] = useState(false);
  const createTutor = api.post.createTutor.useMutation({
    onSuccess: async () => {
      await tutor.refetch();
    },
  });

  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);

  // Redirect new tutors to manage account page
  useEffect(() => {
    if (
      user.user &&
      tutor.data &&
      !tutor.isLoading &&
      !hasRedirected &&
      router.pathname !== '/tutor-onboarding' &&
      router.pathname !== '/tutors/[username]'
    ) {
      // Check if tutor profile is incomplete
      const isIncomplete =
        !tutor.data.username ||
        tutor.data.username === 'None' ||
        !tutor.data.bio ||
        tutor.data.bio === 'None' ||
        !tutor.data.description ||
        tutor.data.description === 'None' ||
        !tutor.data.school ||
        tutor.data.school === 'None' ||
        !tutor.data.major ||
        tutor.data.major === 'None' ||
        !tutor.data.hourlyRate ||
        tutor.data.hourlyRate === 0 ||
        !tutor.data.stripeAccountId;

      if (isIncomplete) {
        setHasRedirected(true);
        void router.push('/tutor-onboarding');
      }
    }
  }, [user.user, tutor.data, tutor.isLoading, router, hasRedirected]); 

  const navigation = [{ name: "Tutors", href: "/tutors" }];

  return (
    <header  data-aos="fade-down" className="absolute inset-x-0 w-4/5 mx-auto px-4 bg-white shadow  rounded-2xl  mt-5 top-0 z-10 ">
      <nav
        className="flex items-center justify-between p-6 md:px-8"
        aria-label="Global"
      >
        <div className="flex md:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <Image src={ourlogo} alt="logo" width={80} height={80}/>
            {/* <p className="font-extrabold text-3xl">P</p> */}
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
        {/* HIDDEN TUTORS SECTION */}
        {/* <div className="hidden md:flex md:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-lg font-semibold leading-6 text-gray-900 underline-offset-4 hover:underline"
            >
              {item.name}
            </Link>
          ))}
          {session?.status == "active" && (
            <>
              {tutor.isFetchedAfterMount ? (
                <div className="text-sm font-semibold leading-6  text-gray-900 underline-offset-4 hover:underline">
                  {(tutor.data  && (tutor.data.approved)) ? (
                    <Link href={`/tutors/${tutor.data.username}`}>
                      View your profile
                    </Link>
                  ) : (
                    <Link
                    key={
                      "manage profile"
                    }
                    href={"/tutor-onboarding"}
                    className="text-sm font-semibold leading-6 text-gray-900 underline-offset-4 hover:underline"
                  >
                    Complete your profile
                  </Link>
                  )}
                </div>
              ) : (
                <LoaderIcon />
              )}
            </>
          )}
        
        </div> */}
        <div className="hidden md:flex md:flex-1 md:justify-end">
          {session?.status === "active" ? (
            <CustomUserMenu />
          ) : (
            <div className="flex gap-12">
             <button onClick={()=>openSignIn({afterSignUpUrl: '/', afterSignInUrl: '/'})} className="text-lg bg-blue-600 whitespace-nowrap py-3 px-4 text-white rounded-2xl hover:underline font-semibold leading-6 ">
                Log in
              </button>
            <Link
              href="/mentors"
              className="font-semibold whitespace-nowrap hover:underline leading-6 text-gray-900 text-lg"
            >
              Become a mentor <span aria-hidden="true">&rarr;</span>
            </Link>
            </div>
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
                      {(tutor.data  && (tutor.data.approved))  ? (
                        <Link
                          onClick={() => setMobileMenuOpen(false)}
                          href={`/tutors/${tutor.data.username}`}
                        >
                          View your profile
                        </Link>
                      ) : (
                        <Link
                        key={
                          "manage profile"
                        }
                        href={"/tutor-onboarding"}
                        className="text-sm font-semibold leading-6 text-gray-900 underline-offset-4 hover:underline"
                      >
                        Complete your profile
                      </Link>
                      )}
                    </div>
                  ) : (
                    <LoaderIcon />
                  )}
                </>
              )}
              <div className="py-6">
                {session?.status === "active" ? (
                  <CustomUserMenu />
                ) : (
                  <div className="w-full">
                  <button onClick={()=>openSignIn()} className="-mx-3 w-full text-left block w rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                   Log in
                </button>
                  <Link
                    href="/mentors"
                    className="-mx-3 block rounded-lg px-3 py-2.5  w-full text-left text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Become a mentor <span aria-hidden="true">&rarr;</span>
                  </Link>
                  </div>
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
