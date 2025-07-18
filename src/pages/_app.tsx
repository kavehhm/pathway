import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Head from "next/head";
import Navbar from "~/components/Navbar";
import { Toaster } from "react-hot-toast";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider  {...pageProps}>
      <div><Toaster/></div>

      <Head>
        <title>Pathway</title>
        <meta name="description" content="Get the best tutoring help, when you need it, where you need it." />
        <link rel="icon" href="/ourlogowhite.png" />
      </Head>
      <div className="min-h-screen">
        <Navbar />
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
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
