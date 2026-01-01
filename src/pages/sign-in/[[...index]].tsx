import { SignIn } from "@clerk/nextjs";
import Head from "next/head";

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Sign in · Pathway</title>
      </Head>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SignIn routing="path" path="/sign-in" />
      </div>
    </>
  );
}


