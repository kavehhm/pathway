import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: ["/api/trpc(.*)", "/", "/tutors", "/tutors(.*)", "/user", "/api/trpc/post.getAllApprovedTutors,post.getAllSchools,post.getAllMajors,post.getAllSubjects"]
});
 
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};