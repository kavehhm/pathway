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
import logo from '../../public/ourlogo.png'
import Link from "next/link";
import { useRouter } from "next/router";
import "aos/dist/aos.css";
import AOS from "aos";
import { useEffect, useState } from "react";
import { useClerk, UserButton, useSession, useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';


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

  function CustomUserMenu() {
    const { isLoaded, user: currentUser } = useUser();
    const { signOut, openUserProfile } = useClerk();
    const router = useRouter();
    // Use the tutor query from parent scope instead of creating a new one
    if (!isLoaded || !currentUser) return null;
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="rounded-full border border-gray-200 bg-white p-1">
            <Image src={currentUser.imageUrl} width={32} height={32} alt="User" className="rounded-full" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="z-[200] mt-2 w-48 rounded-xl border border-gray-200 bg-white px-4 py-3 text-black shadow-2xl"
            sideOffset={5}
          >
            <DropdownMenu.Item asChild>
              <Link 
                href={`/tutors/${tutor.data?.username ?? ''}`} 
                className="block w-full px-2 py-2 rounded hover:bg-gray-100"
              >
                View Profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link 
                href="/tutor-onboarding" 
                className="block w-full px-2 py-2 rounded hover:bg-gray-100"
              >
                Manage Account
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link 
                href="/my-sessions" 
                className="block w-full px-2 py-2 rounded hover:bg-gray-100"
              >
                My Sessions
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <button 
                onClick={() => {
                  if (tutor.data?.stripeAccountId) {
                    window.open(`https://dashboard.stripe.com/${tutor.data.stripeAccountId}`, '_blank');
                  } else {
                    router.push('/tutor-onboarding#stripe');
                  }
                }} 
                className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100"
              >
                Payment Portal
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-gray-200" />
            <DropdownMenu.Item asChild>
              <button onClick={() => signOut(() => router.push('/'))} className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100">Sign Out</button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }
  return (
    <header className="sticky top-0 z-[100]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Disclosure
          data-aos="fade-down"
          as="nav"
          className="relative isolate"
        >
          {/* Glass background layer - opaque enough to block content underneath */}
          <span
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl border border-white/60 bg-white/95 shadow-lg backdrop-blur-lg supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:backdrop-blur-xl"
            aria-hidden="true"
          />
          
          <div className="flex h-20 items-center justify-between px-6 md:px-8 lg:px-12">
            <div className="flex items-center">
              <Link href={'/'} className="flex flex-shrink-0 items-center">
                <Image alt="Pathway Tutors" src={logo} className="h-10 w-auto" />
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              {session?.status === "active" ? (
                <CustomUserMenu />
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={()=>openSignIn()}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => openSignUp()}
                    className="text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900"
                  >
                    Become a tutor <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </Disclosure>
      </div>
    </header>
  );
}
