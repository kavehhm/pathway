import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: [
    "/api/trpc(.*)",
    "/",
    "/tutors",
    "/tutors(.*)",
    "/user",
    "/mentors",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/sso-callback(.*)",
    "/api/trpc/post.getAllApprovedTutors,post.getAllSchools,post.getAllMajors,post.getAllSubjects",
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
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};