import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  getAllConsoleTutors: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany();
  }),
  
  getAllApprovedTutors: publicProcedure
    .input(
      z.object({
        selectedMajors: z.string().array().optional(),
        selectedSubjects: z.string().array().optional(),
        selectedSchools: z.string().array().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      const { selectedMajors, selectedSubjects, selectedSchools } = input;

      return ctx.db.user.findMany({
        where: {
          AND: [
            // Filter by selected majors
            selectedMajors && selectedMajors?.length > 0
              ? { major: { in: selectedMajors } }
              : {},
            // Filter by selected schools
            selectedSchools && selectedSchools.length > 0
              ? { school: { in: selectedSchools } }
              : {},
            // Filter by selected subjects
            selectedSubjects && selectedSubjects.length > 0
              ? {
                  subjects: {
                    // Filter by subjects that have at least one common element
                    // with the selectedSubjects array
                    hasSome: selectedSubjects,
                  },
                }
              : {},
            { approved: true },
          ],
        },
      });
    }),

  getTutor: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.db.user.findUnique({
      where: {
        clerkId: input,
      },
      include: {
        availability: true
      }
    });
  }),

  createTutor: publicProcedure
    .input(
      z.object({
        id: z.string(),
        imageSrc: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, firstName, lastName, imageSrc, email } = input;

      const apiUrl = "https://api.clerk.com/v2/event-types"
      const apiKey = "cal_live_e6043df9d987d87182a3e6384cb2116a"
      const payload = {
        title: "testtutor",
        slug: "tutornameslug",
        lengthInMinutes: 60,
        description: "testdescription"
      }

      // const response = await fetch(apiUrl, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${apiKey}`,
      //     'cal-api-version': '2024-06-14'
      //   },
      //   body: JSON.stringify(payload)
      // })

      // const data = await response.json()
      // console.log(data)

      return ctx.db.user.create({
        data: {
          clerkId: id,
          firstName,
          lastName,
          imageSrc,
          email
        },
      });
    }),

  updateTutor: publicProcedure
    .input(
      z.object({
        id: z.string(),
        bio: z.string().optional(),
        username: z.string().optional(),
        school: z.string().optional(),
        major: z.string().optional(),
        description: z.string().optional(),
        gpa: z.number().optional(),
        country: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.number().optional(),
        tutorInPerson: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        imageSrc: z.string().optional(),
        subjects: z.string().array().optional(),
        hourlyRate: z.number().optional(),
        meetingLink: z.string().optional(),
        availability:  z.array(
          z.object({
            day: z.string(),
            startTime: z.date().optional().nullable(),
            endTime: z.date().optional().nullable(),
            available: z.boolean(),
            visible: z.boolean(),
            timeRange: z.string().nullable(),
          })
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const {
        id,
        bio,
        username,
        school,
        description,
        major,
        gpa,
        country,
        state,
        zipCode,
        tutorInPerson,
        firstName,
        lastName,
        imageSrc,
        subjects,
        hourlyRate,
        meetingLink,
        availability
      } = input;




      const availability2 =  [
        { day: 'Sunday', available: false, timeRange: '' },
        { day: 'Monday', available: false, timeRange: '' },
        { day: 'Tuesday', available: false, timeRange: '' },
        { day: 'Wednesday', available: false, timeRange: '' },
        { day: 'Thursday', available: false, timeRange: '' },
        { day: 'Friday', available: false, timeRange: '' },
        { day: 'Saturday', available: false, timeRange: '' }
      ]

      console.log(availability)


      // await ctx.db.user.update({
      //   where: {
      //     clerkId: id
      //   },
      //   data: {
      //     availability: {
      //       set: []
      //     }
      //   }
      // })
     
        await ctx.db.availability.deleteMany({
          where: {
            user: {
              clerkId: id
            }
          },
        });

      
        await ctx.db.availability.createMany({
          data: availability.map((day) => ({
            userId: id,
            day: day.day,
            visible: day.visible,
            available: day.available,
            timeRange: day.available ? day.timeRange : null,
            startTime: day.startTime,
            endTime: day.endTime
          })),
        });

        const availabilities = await ctx.db.availability.findMany({
          where: { userId: id },
          select: {
            id: true
          }
        })

        
      
      return ctx.db.user.update({
        where: {
          clerkId: id,
        },
        data: {
          bio,
          username,
          school,
          major,
          gpa,
          country,
          description,
          state,
          zipCode,
          tutorInPerson,
          firstName,
          lastName,
          imageSrc,
          subjects,
          hourlyRate,
          meetingLink,
          availability: {
            connect: availabilities
          }
        },
      });
    }),

  approveTutor: publicProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      return ctx.db.user.update({
        where: {
          clerkId: input,
        },
        data: {
          approved: true,
        },
      });
    }),

  getFilteredTutor: publicProcedure
    .input(
      z.object({
        schools: z.string().array().optional(),
        majors: z.string().array(),
      }),
    )
    .query(({ ctx, input }) => {
      const whereClause = {
        ...(input.schools
          ? {
              school: {
                in: input.schools,
              },
            }
          : {}),
        ...(input.majors
          ? {
              major: {
                in: input.majors,
              },
            }
          : {}),
      };

      return ctx.db.user.findMany({
        where: {
          school: {
            in: input.schools,
          },
        },
      });
    }),

  getAllSchools: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        approved: true,
      },
      select: {
        school: true,
      },
    });
  }),
  getAllMajors: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        approved: true,
      },
      select: {
        major: true,
      },
    });
  }),

  getSingleTutor: publicProcedure.input(z.string()).query(({ input, ctx }) => {
    return ctx.db.user.findUnique({
      where: {
        username: input,
      },
    });
  }),

  getAllSubjects: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        approved: true,
      },
      select: {
        subjects: true,
      },
    });
  }),

  
});
