import { SignUp } from "@clerk/nextjs";
import Head from "next/head";

export default function SignUpPage() {
  return (
    <>
      <Head>
        <title>Sign up · Pathway</title>
      </Head>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SignUp routing="path" path="/sign-up" />
      </div>
    </>
  );
}


