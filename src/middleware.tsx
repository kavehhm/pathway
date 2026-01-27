import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: [
    "/api/trpc(.*)",
    "/api/health",
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
});
 
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};