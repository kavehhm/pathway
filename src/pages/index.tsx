import Head from "next/head";
import Link from "next/link";


import { api } from "~/utils/api";
import Hero from "~/components/Hero";

export default function Home() {



  return (
    <>
      <Head>
        <title>Pathway</title>
        <meta name="description" content="Get the best tutoring help, when you need it, where you need it." />
        <link rel="icon" href="/logo.png" />
      </Head>
      
      <div>
        <Hero />
      </div>
    </>
  );
}
