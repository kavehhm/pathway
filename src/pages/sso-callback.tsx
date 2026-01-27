import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function SSOCallbackPage() {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);

  // Handle cases where the callback fails (e.g., cold start race condition)
  useEffect(() => {
    // Set a timeout - if we're still on this page after 10 seconds, something went wrong
    const timeout = setTimeout(() => {
      setHasError(true);
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  // If error state, show retry option
  if (hasError) {
    return (
      <>
        <Head>
          <title>Sign in issue · Pathway</title>
        </Head>
        <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Taking longer than expected...
            </h2>
            <p className="text-gray-600 mb-6">
              There was an issue completing your sign in. Please try again.
            </p>
            <button
              onClick={() => router.push("/sign-up")}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              Return to Sign Up
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Signing in… · Pathway</title>
      </Head>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <AuthenticateWithRedirectCallback
          afterSignInUrl="/"
          afterSignUpUrl="/tutor-onboarding"
        />
        {/* Loading indicator */}
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    </>
  );
}


