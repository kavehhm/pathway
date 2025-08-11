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
      }),
    )
    .query(({ input, ctx }) => {
      const { selectedMajors, selectedSubjects, selectedSchools, firstSessionFreeOnly } = input;

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
            { stripeAccountStatus: 'active' },
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

        // Calculate platform fee (20% of the total amount)
        const platformFee = Math.round(amount * 0.20);
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
        date: z.string(),
        time: z.string(),
        status: z.string().optional().default("confirmed"),
        free: z.boolean().optional().default(false)
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, date, time, status, free } = input;

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
        } as any;
      }

      try {
        const created = await ctx.db.booking.create({
          data: {
            tutorId,
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
          return { id: dup?.id ?? 'conflict', conflicted: true as const } as any;
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
        date: z.string(),
        time: z.string(),
        paymentIntentId: z.string(),
        studentName: z.string(),
        studentEmail: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { tutorId, date, time, paymentIntentId, studentName, studentEmail } = input;

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
          return { id: existing.id, conflicted: true as const } as any;
        }

        // Create a booking record in the database
        const booking = await ctx.db.booking.create({
          data: {
            tutorId,
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

  
});
