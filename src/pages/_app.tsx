import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Head from "next/head";
import NewNav from "~/components/NewNav";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/router";
import CursorRipples from "~/components/CursorRipples";

const MyApp: AppType = ({ Component, pageProps }) => {
  const router = useRouter();
  const isLandingPage = router.pathname === "/";

  return (
    <ClerkProvider
      {...pageProps}
      afterSignInUrl="/"
      afterSignUpUrl="/tutor-onboarding"
    >
      <div><Toaster/></div>

      <Head>
        <title>Pathway</title>
        <meta name="description" content="Get the best tutoring help, when you need it, where you need it." />
        <link rel="icon" href="/ourlogo720.png" />
        
        {/* Open Graph / iMessage preview metadata */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Pathway" />
        <meta property="og:description" content="Connect with verified tutors from top universities" />
        <meta property="og:image" content="https://www.pathwaytutors.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Pathway" />
        <meta property="og:site_name" content="Pathway" />
        
        {/* Twitter Card metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pathway" />
        <meta name="twitter:description" content="Connect with verified tutors from top universities" />
        <meta name="twitter:image" content="https://pathwaytutors.org/og-image.png" />
      </Head>
      <div className="relative min-h-screen isolate">
        <CursorRipples enabled={isLandingPage} />
        <div className="relative z-10">
        <NewNav />
        {/* Page load animation wrapper */}
        <div
          className="animate-fadeinup transition-all duration-700 ease-out"
          style={{
            animation: 'fadeinup 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <Component {...pageProps} />
        </div>
        </div>
      </div>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
