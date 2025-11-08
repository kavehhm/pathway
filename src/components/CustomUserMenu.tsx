import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { api } from "~/utils/api";


export default function CustomUserMenu() {
  const { isLoaded, user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const tutor = api.post.getTutor.useQuery(user?.id ?? "");

  if (!isLoaded || !user) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-full aspect-square bg-white p-0">
          <Image src={user.imageUrl} width={48} height={48} alt="User" className="rounded-full aspect-square object-cover" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white px-4 py-3 text-black drop-shadow-2xl">
          <DropdownMenu.Item asChild>
            <Link href={`/tutors/${tutor.data?.username}`} className="block w-full px-2 py-2 rounded hover:bg-gray-100">View Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href={"/tutor-onboarding"} className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100">Manage Account</Link>
          </DropdownMenu.Item>
          {tutor.data?.stripeAccountStatus == "active" && <DropdownMenu.Item asChild>
            <Link href={`https://connect.stripe.com/app/express#${tutor.data?.stripeAccountId}`} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100">Payment Portal</Link>
          </DropdownMenu.Item>}
          <DropdownMenu.Separator className="my-2 h-px bg-gray-200" />
          <DropdownMenu.Item asChild>
            <button onClick={() => signOut(() => router.push('/'))} className="block w-full text-left px-2 py-2 rounded hover:bg-gray-100">Sign Out</button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
} 