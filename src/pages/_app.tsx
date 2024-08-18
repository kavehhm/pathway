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
        <link rel="icon" href="/logo.png" />
      </Head>
      <Navbar />
      <div className="py-12">
      <Component {...pageProps} />
      </div>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
