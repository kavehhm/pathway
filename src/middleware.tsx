import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/tutors(.*)",
    "/mentors(.*)",
    "/user",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/sso-callback(.*)",

    // Public read endpoints
    "/api/trpc/post.getAllApprovedTutors",
    "/api/trpc/post.getAllSchools",
    "/api/trpc/post.getAllMajors",
    "/api/trpc/post.getAllSubjects",
  ],

  // ignoredRoutes completely bypass Clerk middleware - use for health checks, webhooks, etc.
  ignoredRoutes: [
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
