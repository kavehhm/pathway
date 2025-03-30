import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import logo from '../../public/logo.png'
import Link from "next/link";
import { useRouter } from "next/router";
import "aos/dist/aos.css";
import AOS from "aos";
import { useEffect, useState } from "react";
import { useClerk, UserButton, useSession, useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";


export default function NewNav() {


  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openSignIn, openSignUp } = useClerk();
  const user = useUser();
  const { session } = useSession();
  const tutor = api.post.getTutor.useQuery(user.user?.id ?? "");
  const createTutor = api.post.createTutor.useMutation({
    onSuccess: async () => {
      await tutor.refetch();
    },
  });

  
  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []); 
  const router = useRouter();
  const url = router.pathname;
  const navigation = [
    {
      name: "Home",
      href: "/",
      current: !(
        url.includes("about-us") ||
        url.includes("pricing") ||
        url.includes("service")
      ),
    },
    {
      name: "About us",
      href: "/about-us",
      current: url.includes("about-us"),
    },
    {
      name: "Pricing",
      href: "/pricing",
      current: url.includes("pricing"),
    },
  ];
  return (
    <Disclosure data-aos="fade-down" as="nav" className="bg-white shadow py-2 rounded-2xl">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-12">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link href={'/'} className="flex flex-shrink-0 items-center">
              <Image alt="Your Company" src={logo} className="h-8 w-auto" />
            </Link>
          </div>
          <div className=" ml-6 flex items-center">
            {/* <div className="hidden md:mr-6 md:flex md:space-x-8">
              {navigation.map((nav) => (
                <Link
                  className={`inline-flex items-center border-b-2 ${
                    nav.current
                      ? `border-blue-500 text-gray-900`
                      : `border-transparent text-gray-700 hover:text-gray-800`
                  } px-1 pt-1 text-md font-medium `}
                  key={nav.href}
                  href={nav.href}
                >
                  {nav.name}
                </Link>
              ))}

              <Flyout />
            </div> */}
              {/* Current: "border-blue-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}

              {session?.status === "active" ? (
            <UserButton
              userProfileMode="navigation"
              userProfileUrl={tutor && "/tutor-onboarding"}
              afterSignOutUrl="/"
            />
          ) : (
            <div className="flex gap-7">
             <button onClick={()=>openSignIn()} className="text-sm hover:underline font-semibold leading-6 text-gray-900">
                Log in
              </button>
            <button
              onClick={() => openSignUp()}
              className="text-sm font-semibold hover:underline leading-6 text-gray-900"
            >
              Become a tutor <span aria-hidden="true">&rarr;</span>
            </button>
            </div>
          )}
            <Link
            href="#contact"
              type="button"
              className="relative rounded-2xl bg-blue-600 p-4 text-white font-bold hover:bg-blue-700 transition"
            >
              Contact Us
            </Link>

            {/* Profile dropdown */}
          </div>
          <div className="-mr-2 flex items-center hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block h-6 w-6 group-data-[open]:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden h-6 w-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="md:hidden">
        

        <div className="space-y-1 pb-2 pt-2">
        {navigation.map((nav) => (
          <DisclosureButton
            as="a"
            className={
              nav.current
                ? "block border-l-4 border-blue-500 bg-blue-50 py-2 pl-3 pr-4 text-base font-medium text-blue-700"
                : "block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
            }
            key={nav.href}
            href={nav.href}
          >
            {nav.name}
          </DisclosureButton>
        ))}
        <div className="border-t border-gray-200 pb-3 pt-4">
        {/* <Flyout /> */}
        <Link href="#contact"
              type="button"
              className=" rounded-sm cursor-pointer bg-blue-500 ml-3 p-1.5   text-white hover:bg-blue-600 transition"
            >
              Contact Us
            </Link>
            </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
