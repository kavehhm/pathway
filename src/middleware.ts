import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    // Public marketing pages (with and without i18n locale prefixes)
    "/",
    "/en",
    "/tutors(.*)",
    "/en/tutors(.*)",
    "/mentors(.*)",
    "/en/mentors(.*)",
    "/user",
    "/sign-in(.*)",
    "/en/sign-in(.*)",
    "/sign-up(.*)",
    "/en/sign-up(.*)",
    "/sso-callback(.*)",
    "/en/sso-callback(.*)",

    // Public read endpoints
    "/api/trpc/post.getAllApprovedTutors",
    "/api/trpc/post.getAllSchools",
    "/api/trpc/post.getAllMajors",
    "/api/trpc/post.getAllSubjects",
  ],

  // ignoredRoutes completely bypass Clerk middleware - use for health checks, webhooks, etc.
  ignoredRoutes: [
    // Public pages should bypass Clerk entirely (important for crawlers like Googlebot)
    "/",
    "/en",
    "/tutors(.*)",
    "/en/tutors(.*)",
    "/mentors(.*)",
    "/en/mentors(.*)",

    "/api/health",
    "/api/stripe-webhooks",
    "/api/send-booking-email",
    "/api/test-email",
    "/api/test-calendar",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
