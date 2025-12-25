import { z } from "zod";
import Stripe from "stripe";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-06-30.basil",
});

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
        firstSessionFreeOnly: z.boolean().optional(),
        selectedCourses: z.string().array().optional(), // Array of course UUIDs
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { selectedMajors, selectedSubjects, selectedSchools, firstSessionFreeOnly, selectedCourses, minPrice, maxPrice } = input;

      // If courses are selected, we need to filter tutors who teach those courses
      const courseFilter = selectedCourses && selectedCourses.length > 0
        ? {
            tutoredCourses: {
              some: {
                courseId: {
                  in: selectedCourses,
                },
              },
            },
          }
        : {};

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
            // Filter by first session free
            firstSessionFreeOnly === true
              ? { firstSessionFree: true }
              : {},
            // Filter by price range
            minPrice !== undefined || maxPrice !== undefined
              ? {
                  hourlyRate: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined && maxPrice < 100 ? { lte: maxPrice } : {}),
                  },
                }
              : {},
            // Filter by courses
            courseFilter,
            { stripeAccountStatus: 'active' },
          ],
        },
        include: {
          bookings: {
            where: {
              free: false, // Only count paid bookings
            },
          },
          tutoredCourses: {
            include: {
              course: true,
            },
          },
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
        courseIds: z.string().array().optional(), // Array of course UUIDs
        hourlyRate: z.number().optional(),
        meetingLink: z.string().optional(),
        timezone: z.string().optional(),
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
        firstSessionFree: z.boolean().optional(),
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
        courseIds,
        hourlyRate,
        meetingLink,
        timezone,
        availability,
        firstSessionFree,
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

        // Handle course updates if provided
        if (courseIds !== undefined) {
          // Get user's UUID from clerkId
          const user = await ctx.db.user.findUnique({
            where: { clerkId: id },
            select: { id: true },
          });

          if (user) {
            // Delete existing tutor courses
            await ctx.db.tutorCourse.deleteMany({
              where: { userId: user.id },
            });

            // Add new courses if any
            if (courseIds.length > 0) {
              await ctx.db.tutorCourse.createMany({
                data: courseIds.map(courseId => ({
                  userId: user.id,
                  courseId,
                })),
              });
            }
          }
        }
      
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
          timezone,
          availability: {
            connect: availabilities
          },
          ...(firstSessionFree !== undefined ? { firstSessionFree } : {}),
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
        stripeAccountStatus: 'active',
      },
      select: {
        school: true,
      },
    });
  }),
  getAllMajors: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        stripeAccountStatus: 'active',
      },
      select: {
        major: true,
      },
    });
  }),

  // .edu email verification
  eduStartVerification: publicProcedure
    .input(
      z.object({
        tutorId: z.string(), // clerkId
        eduEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, eduEmail } = input;

      const normalizedEmail = eduEmail.trim().toLowerCase();
      if (!normalizedEmail.endsWith('.edu')) {
        throw new Error('Email must end with .edu');
      }

      // Generate 6-digit numeric code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await ctx.db.user.update({
        where: { clerkId: tutorId },
        data: ({
          eduEmail: normalizedEmail,
          eduVerified: false,
          eduVerificationCode: code,
          eduVerificationExpiresAt: expiresAt,
        } as any),
      });

      return { code, expiresAt };
    }),

  eduResendVerification: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId } = input;
      const user = (await ctx.db.user.findUnique({
        where: { clerkId: tutorId },
        select: ({ eduEmail: true } as any),
      })) as any;
      if (!user?.eduEmail) {
        throw new Error('No .edu email on file');
      }
      if (!user.eduEmail.toLowerCase().endsWith('.edu')) {
        throw new Error('Email on file is not a .edu email');
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await ctx.db.user.update({
        where: { clerkId: tutorId },
        data: ({
          eduVerified: false,
          eduVerificationCode: code,
          eduVerificationExpiresAt: expiresAt,
        } as any),
      });

      return { code, expiresAt, eduEmail: user.eduEmail };
    }),

  eduVerifyCode: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
        code: z.string().min(4).max(10),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, code } = input;
      const user = (await ctx.db.user.findUnique({
        where: { clerkId: tutorId },
        select: ({
          eduVerificationCode: true,
          eduVerificationExpiresAt: true,
        } as any),
      })) as any;

      if (!user?.eduVerificationCode || !user.eduVerificationExpiresAt) {
        throw new Error('No verification in progress');
      }

      if (new Date() > user.eduVerificationExpiresAt) {
        throw new Error('Verification code expired');
      }

      if (code.trim() !== user.eduVerificationCode) {
        throw new Error('Invalid verification code');
      }

      await ctx.db.user.update({
        where: { clerkId: tutorId },
        data: ({
          eduVerified: true,
          eduVerificationCode: null,
          eduVerificationExpiresAt: null,
        } as any),
      });

      return { verified: true };
    }),

  getSingleTutor: publicProcedure.input(z.string()).query(({ input, ctx }) => {
    return ctx.db.user.findUnique({
      where: {
        username: input,
      },
      include: {
        availability: true,
        bookings: true
      }
    });
  }),

  getBookingCount: publicProcedure.input(z.string()).query(({ input, ctx }) => {
    return ctx.db.booking.count({
      where: {
        tutorId: input,
        free: false
      },
    });
  }),

  getAllSubjects: publicProcedure.query(({ ctx }) => {
    const result = ctx.db.user.findMany({
      where: {
        stripeAccountStatus: 'active',
      },
      select: {
        subjects: true,
      },
    });
    console.log("API getAllSubjects result:", result);
    return result;
  }),

  createPaymentIntent: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
        date: z.string(),
        time: z.string(),
        amount: z.number(), // amount in cents
        studentName: z.string(),
        studentEmail: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, date, time, amount, studentName, studentEmail } = input;

      try {
        // Get tutor's Stripe Connect account
        const tutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { stripeAccountId: true, stripeAccountStatus: true }
        });

        if (!tutor?.stripeAccountId) {
          throw new Error('Tutor has not set up their payment account');
        }

        if (tutor.stripeAccountStatus !== 'active') {
          throw new Error('Tutor payment account is not active');
        }

        // Calculate platform fee (10% of the total amount)
        const platformFee = Math.round(amount * 0.10);
        const tutorAmount = amount - platformFee;

        console.log(`Payment breakdown: Total: $${amount/100}, Platform fee: $${platformFee/100}, Tutor receives: $${tutorAmount/100}`);

        // Create a PaymentIntent with Stripe Connect
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          application_fee_amount: platformFee, // Platform fee
          transfer_data: {
            destination: tutor.stripeAccountId, // Transfer to tutor's account
          },
          metadata: {
            tutorId,
            date,
            time,
            studentName,
            studentEmail,
            platformFee: platformFee.toString(),
            tutorAmount: tutorAmount.toString(),
          },
        });

        return {
          clientSecret: paymentIntent.client_secret,
        };
      } catch (error) {
        console.error('Error creating payment intent:', error);
        throw new Error('Failed to create payment intent');
      }
    }),

  createBooking: publicProcedure
    .input(
      z.object({
        tutorId: z.string(), // clerkId of the tutor
        studentClerkId: z.string().optional(), // clerkId of the student
        date: z.string(),
        time: z.string(),
        status: z.string().optional().default("confirmed"),
        free: z.boolean().optional().default(false)
      }),
    )
    .output(
      z.union([
        z.object({
          id: z.string(),
          conflicted: z.literal(true),
        }),
        z.object({
          id: z.string(),
          tutorId: z.string(),
          studentClerkId: z.string().nullable(),
          date: z.date(),
          time: z.string(),
          status: z.string(),
          free: z.boolean(),
        })
      ])
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, studentClerkId, date, time, status, free } = input;

      // Convert date string to DateTime (normalized to midnight UTC to match unique composite)
      const bookingDate = new Date(date);
      const normalizedDate = new Date(bookingDate.toISOString().split('T')[0] ?? date);

      // Guard: prevent duplicate booking at same tutor/date/time
      const existing = await ctx.db.booking.findFirst({
        where: {
          tutorId,
          time,
          date: normalizedDate,
        },
        select: { id: true },
      });

      if (existing) {
        // Idempotent: return existing-like response with a hint
        return {
          id: existing.id,
          conflicted: true as const,
        };
      }

      try {
        const created = await ctx.db.booking.create({
          data: {
            tutorId,
            studentClerkId,
            date: normalizedDate,
            time,
            status,
            free,
          },
        });
        return created;
      } catch (err) {
        // In case of a race, unique constraint may still throw. Convert to graceful conflict.
        // Prisma code P2002 corresponds to unique constraint violation.
        const anyErr = err as any;
        if (anyErr?.code === 'P2002') {
          const dup = await ctx.db.booking.findFirst({
            where: { tutorId, time, date: normalizedDate },
            select: { id: true },
          });
          return { id: dup?.id ?? 'conflict', conflicted: true as const };
        }
        throw err;
      }
    }),

  createStripeConnectAccount: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
        email: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, email, firstName, lastName } = input;

      try {
        // Check if tutor already has a Stripe account
        const existingTutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { stripeAccountId: true }
        });

        let accountId: string;

        if (existingTutor?.stripeAccountId) {
          // Use existing account
          accountId = existingTutor.stripeAccountId;
          
          // Verify the account still exists in Stripe
          try {
            await stripe.accounts.retrieve(accountId);
          } catch (error) {
            // Account doesn't exist in Stripe, create a new one
            const newAccount = await stripe.accounts.create({
              type: 'express',
              country: 'US',
              email: email,
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
              business_type: 'individual',
              individual: {
                first_name: firstName,
                last_name: lastName,
                email: email,
              },
            });
            
            accountId = newAccount.id;
            
            // Update the tutor's record with the new Stripe account ID
            await ctx.db.user.update({
              where: { clerkId: tutorId },
              data: {
                stripeAccountId: accountId,
                stripeAccountStatus: newAccount.charges_enabled ? 'active' : 'pending',
              },
            });
          }
        } else {
          // Create a new Stripe Connect account
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            individual: {
              first_name: firstName,
              last_name: lastName,
              email: email,
            },
          });

          accountId = account.id;

          // Update the tutor's record with the Stripe account ID
          await ctx.db.user.update({
            where: { clerkId: tutorId },
            data: {
              stripeAccountId: accountId,
              stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
            },
          });
        }

        // Create an account link for onboarding
        // In test/development mode, we can use localhost URLs
        const baseUrl = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
          ? 'http://localhost:3000' 
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
          
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${baseUrl}/tutor-onboarding?refresh=true`,
          return_url: `${baseUrl}/tutor-onboarding?success=true`,
          type: 'account_onboarding',
        });

        return {
          accountId: accountId,
          accountLink: accountLink.url,
          status: 'pending', // Will be updated when they complete onboarding
        };
      } catch (error) {
        console.error('Error creating Stripe Connect account:', error);
        throw new Error('Failed to create payment account');
      }
    }),

    getStripeAccountStatus: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const tutorId = input;

      try {
        const tutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { stripeAccountId: true, stripeAccountStatus: true }
        });

        if (!tutor?.stripeAccountId) {
          return { status: 'not_setup' };
        }

        // Get the latest status from Stripe
        const account = await stripe.accounts.retrieve(tutor.stripeAccountId);
        console.log('Stripe account object:', JSON.stringify(account, null, 2));

        // Only use charges_enabled to determine if active
        const isActive = account.charges_enabled;
        await ctx.db.user.update({
          where: { clerkId: tutorId },
          data: {
            stripeAccountStatus: isActive ? 'active' : 'pending',
          },
        });

        return {
          status: isActive ? 'active' : 'pending',
          accountId: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
        };
      } catch (error) {
        console.error('Error checking Stripe account status:', error);
        return { status: 'error', error: "Something went wrong" };
      }
    }),

  bookSession: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
        studentClerkId: z.string().optional(),
        date: z.string(),
        time: z.string(),
        paymentIntentId: z.string(),
        studentName: z.string(),
        studentEmail: z.string(),
      }),
    )
    .output(
      z.union([
        z.object({
          id: z.string(),
          conflicted: z.literal(true),
        }),
        z.object({
          success: z.literal(true),
          message: z.string(),
          bookingId: z.string(),
          tutorInfo: z.object({
            tutorName: z.string(),
            tutorEmail: z.string(),
            meetingLink: z.string().nullable(),
            timezone: z.string().nullable(),
          }).nullable(),
        })
      ])
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, studentClerkId, date, time, paymentIntentId, studentName, studentEmail } = input;

      console.log(`Booking session for tutor ${tutorId} on ${date} at ${time}`);
      
      try {
        // Verify the payment was successful
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          throw new Error('Payment not completed');
        }

        // Normalize date and guard against duplicates
        const bookingDate = new Date(date);
        const normalizedDate = new Date(bookingDate.toISOString().split('T')[0] ?? date);

        const existing = await ctx.db.booking.findFirst({
          where: { tutorId, time, date: normalizedDate },
          select: { id: true },
        });

        if (existing) {
          return { id: existing.id, conflicted: true as const };
        }

        // Create a booking record in the database
        const booking = await ctx.db.booking.create({
          data: {
            tutorId,
            studentClerkId,
            date: normalizedDate,
            time,
            status: 'confirmed'
          }
        });

        console.log('Booking created:', booking);

        // Get tutor information for email
        const tutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { firstName: true, lastName: true, email: true, meetingLink: true, timezone: true }
        });

        return { 
          success: true, 
          message: 'Session booked successfully', 
          bookingId: booking.id,
          tutorInfo: tutor ? {
            tutorName: `${tutor.firstName} ${tutor.lastName}`,
            tutorEmail: tutor.email,
            meetingLink: tutor.meetingLink,
            timezone: tutor.timezone
          } : null
        };
      } catch (error) {
        console.error('Error creating booking:', error);
        throw new Error('Failed to create booking');
      }
    }),

  // Get all courses for a specific school
  getCoursesBySchool: publicProcedure
    .input(z.object({ school: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.course.findMany({
        where: {
          school: input.school,
        },
        orderBy: {
          courseId: 'asc',
        },
      });
    }),

  // Get all available schools with courses
  getSchoolsWithCourses: publicProcedure.query(async ({ ctx }) => {
    const schools = await ctx.db.course.groupBy({
      by: ['school'],
      _count: {
        id: true,
      },
    });
    return schools.map(s => ({ school: s.school, count: s._count.id }));
  }),

  // Add courses to a tutor's profile
  addTutorCourses: publicProcedure
    .input(
      z.object({
        userId: z.string(), // clerkId
        courseIds: z.string().array(), // Array of course UUIDs
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, get the user's actual UUID from their clerkId
      const user = await ctx.db.user.findUnique({
        where: { clerkId: input.userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Delete existing tutor courses
      await ctx.db.tutorCourse.deleteMany({
        where: { userId: user.id },
      });

      // Add new courses
      if (input.courseIds.length > 0) {
        await ctx.db.tutorCourse.createMany({
          data: input.courseIds.map(courseId => ({
            userId: user.id,
            courseId,
          })),
        });
      }

      return { success: true };
    }),

  // Get tutor's courses
  getTutorCourses: publicProcedure
    .input(z.string()) // clerkId
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: input },
        select: { 
          id: true,
          tutoredCourses: {
            include: {
              course: true,
            },
          },
        },
      });

      return user?.tutoredCourses.map(tc => tc.course) ?? [];
    }),

  // ============= REVIEW PROCEDURES =============

  // Create or update a review
  createReview: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
        tutorClerkId: z.string(),
        studentClerkId: z.string(),
        rating: z.number().min(1).max(5), // 1.0 to 5.0 with half stars
        reviewText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if booking exists and is completed and paid
      const booking = await ctx.db.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'completed') {
        throw new Error('Can only review completed sessions');
      }

      if (booking.free) {
        throw new Error('Can only review paid sessions');
      }

      // Check if review already exists
      const existingReview = await ctx.db.review.findUnique({
        where: { bookingId: input.bookingId },
      });

      if (existingReview) {
        // Update existing review
        return ctx.db.review.update({
          where: { id: existingReview.id },
          data: {
            rating: input.rating,
            reviewText: input.reviewText,
          },
        });
      }

      // Create new review
      return ctx.db.review.create({
        data: {
          bookingId: input.bookingId,
          tutorClerkId: input.tutorClerkId,
          studentClerkId: input.studentClerkId,
          rating: input.rating,
          reviewText: input.reviewText,
        },
      });
    }),

  // Update review text
  updateReview: publicProcedure
    .input(
      z.object({
        reviewId: z.string(),
        rating: z.number().min(1).max(5).optional(),
        reviewText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.review.update({
        where: { id: input.reviewId },
        data: {
          rating: input.rating,
          reviewText: input.reviewText,
        },
      });
    }),

  // Add tutor response to review
  addTutorResponse: publicProcedure
    .input(
      z.object({
        reviewId: z.string(),
        tutorResponse: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.review.update({
        where: { id: input.reviewId },
        data: {
          tutorResponse: input.tutorResponse,
        },
      });
    }),

  // Get reviews for a tutor
  getTutorReviews: publicProcedure
    .input(z.string()) // tutorClerkId
    .query(async ({ ctx, input }) => {
      return ctx.db.review.findMany({
        where: { tutorClerkId: input },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              imageSrc: true,
            },
          },
          booking: {
            select: {
              date: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }),

  // Get average rating for a tutor
  getTutorRating: publicProcedure
    .input(z.string()) // tutorClerkId
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.review.findMany({
        where: { tutorClerkId: input },
        select: { rating: true },
      });

      if (reviews.length === 0) {
        return { averageRating: 0, reviewCount: 0 };
      }

      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      const averageRating = sum / reviews.length;

      return {
        averageRating: Math.round(averageRating * 2) / 2, // Round to nearest 0.5
        reviewCount: reviews.length,
      };
    }),

  // Get student's completed bookings that can be reviewed
  getReviewableBookings: publicProcedure
    .input(z.string()) // studentClerkId
    .query(async ({ ctx, input }) => {
      return ctx.db.booking.findMany({
        where: {
          studentClerkId: input,
          status: 'completed',
          free: false,
        },
        include: {
          tutor: {
            select: {
              firstName: true,
              lastName: true,
              imageSrc: true,
              clerkId: true,
            },
          },
          review: true,
        },
        orderBy: {
          date: 'desc',
        },
      });
    }),
  
  getTutorBookings: publicProcedure
    .input(z.string()) // tutorClerkId
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.db.booking.findMany({
        where: {
          tutorId: input,
          status: 'completed',
          free: false,
          studentClerkId: {
            not: null,
          },
        },
        include: {
          review: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      // Fetch student data for each booking
      const bookingsWithStudents = await Promise.all(
        bookings.map(async (booking) => {
          const student = await ctx.db.user.findUnique({
            where: {
              clerkId: booking.studentClerkId!,
            },
            select: {
              firstName: true,
              lastName: true,
              imageSrc: true,
              clerkId: true,
            },
          });

          return {
            ...booking,
            student,
          };
        })
      );

      return bookingsWithStudents;
    }),
  
});
