import { z } from "zod";
import Stripe from "stripe";
import { promises as fs } from "fs";
import path from "path";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getSchoolPrestigeRank } from "~/schoolPrestige";
import { isValidUrl } from "~/lib/validateUrl";
import { releasePendingEarnings } from "~/lib/releasePendingEarnings";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-06-30.basil",
});

let cachedCompanies: string[] | null = null;
let cachedCompaniesMtimeMs: number | null = null;
async function getCompaniesFromCsv() {
  // In development we want edits to `public/companies_1000.csv` to reflect immediately.
  const isDev = process.env.NODE_ENV !== "production";

  const filePath = path.join(process.cwd(), "public", "companies_1000.csv");
  if (!isDev) {
    try {
      const stat = await fs.stat(filePath);
      if (cachedCompanies && cachedCompaniesMtimeMs === stat.mtimeMs) {
        return cachedCompanies;
      }
      cachedCompaniesMtimeMs = stat.mtimeMs;
    } catch {
      // fall through; readFile will throw a clearer error if missing
    }
  }

  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // CSV is single-column: header `company_name`, then one company per line.
  const companies = lines
    .slice(1)
    .map((line) => line.replace(/^"|"$/g, "").trim())
    .filter(Boolean);

  const parsed = Array.from(new Set(companies)).sort((a, b) => a.localeCompare(b));

  // Cache only outside of dev.
  if (!isDev) cachedCompanies = parsed;
  return parsed;
}

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
        selectedCompanies: z.string().array().optional(),
        careerIsInternship: z.boolean().optional(),
        transferOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const {
        selectedMajors,
        selectedSubjects,
        selectedSchools,
        firstSessionFreeOnly,
        selectedCourses,
        minPrice,
        maxPrice,
        selectedCompanies,
        careerIsInternship,
        transferOnly,
      } = input;

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

      const tutors = await ctx.db.user.findMany({
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
            // Filter by career company + internship/full-time
            selectedCompanies && selectedCompanies.length > 0
              ? {
                  careerCompanies: {
                    hasSome: selectedCompanies,
                  },
                  ...(careerIsInternship !== undefined ? { careerIsInternship } : {}),
                }
              : {},
            // Filter by transfer mentors (if checked)
            transferOnly === true ? { isTransfer: true } : {},
            // Filter by courses
            courseFilter,
            // Only show approved tutors
            { approved: true },
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

      // Sort tutors by school prestige (lower rank = more prestigious = shown first)
      const sortedTutors = tutors.sort((a, b) => {
        const rankA = getSchoolPrestigeRank(a.school);
        const rankB = getSchoolPrestigeRank(b.school);
        return rankA - rankB;
      });

      return sortedTutors;
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
        careerCompanies: z.string().array().optional(),
        careerIsInternship: z.boolean().optional(),
        isTransfer: z.boolean().optional(),
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

        // ============= AUTO-APPROVAL LOGIC =============
        // Check if all required fields are filled to auto-approve the tutor
        const hasValidImage = !!imageSrc && imageSrc !== '' && !imageSrc.includes('gravatar');
        const hasUsername = !!username && username !== 'None' && username.trim() !== '';
        const hasHourlyRate = !!hourlyRate && hourlyRate > 0;
        const hasBio = !!bio && bio !== 'None' && bio.trim() !== '';
        const hasDescription = !!description && description !== 'None' && description.trim() !== '';
        const hasSchool = !!school && school !== 'None' && school.trim() !== '';
        const hasMajor = !!major && major !== 'None' && major.trim() !== '';
        const hasGpa = !!gpa && gpa > 0;
        const hasSubjects = !!subjects && subjects.length > 0;
        
        // Meeting link is now OPTIONAL for approval
        // If provided, it must be a valid URL (not just text like "Google meets")
        const meetingLinkProvided = !!meetingLink && meetingLink.trim() !== '';
        const isValidMeetingLinkUrl = meetingLinkProvided ? isValidUrl(meetingLink) : true;
        
        // Check if at least one availability slot has both start and end time
        const hasValidAvailability = availability.some(
          (day) => day.available && day.startTime && day.endTime
        );

        // Auto-approve if all required fields are complete
        // Meeting link is optional - if provided it must be valid, if not provided that's OK
        const shouldBeApproved = 
          hasValidImage &&
          hasUsername &&
          hasHourlyRate &&
          hasBio &&
          hasDescription &&
          hasSchool &&
          hasMajor &&
          hasGpa &&
          hasSubjects &&
          isValidMeetingLinkUrl && // Only blocks approval if an INVALID link is provided
          hasValidAvailability;

        console.log('Auto-approval check:', {
          hasValidImage,
          hasUsername,
          hasHourlyRate,
          hasBio,
          hasDescription,
          hasSchool,
          hasMajor,
          hasGpa,
          hasSubjects,
          meetingLinkProvided,
          isValidMeetingLinkUrl,
          hasValidAvailability,
          shouldBeApproved,
        });
      
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
          ...(input.careerCompanies !== undefined ? { careerCompanies: input.careerCompanies } : {}),
          ...(input.careerIsInternship !== undefined ? { careerIsInternship: input.careerIsInternship } : {}),
          ...(input.isTransfer !== undefined ? { isTransfer: input.isTransfer } : {}),
          availability: {
            connect: availabilities
          },
          ...(firstSessionFree !== undefined ? { firstSessionFree } : {}),
          // Auto-set approved status based on profile completeness
          approved: shouldBeApproved,
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

  getAllCompanies: publicProcedure.query(async () => {
    return await getCompaniesFromCsv();
  }),

  getAllTutorCompanies: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.user.findMany({
      where: {
        approved: true,
      },
      select: { careerCompanies: true },
    });

    const unique = new Set<string>();
    rows.forEach((row) => {
      (row.careerCompanies ?? []).forEach((c) => {
        if (typeof c === "string" && c.trim()) unique.add(c.trim());
      });
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }),

  getAvailableCoursesForSchool: publicProcedure
    .input(z.object({ school: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.tutorCourse.findMany({
        where: {
          user: {
            approved: true,
            school: input.school,
          },
        },
        include: {
          course: true,
        },
        distinct: ["courseId"],
      });

      return rows
        .map((r) => r.course)
        .filter(Boolean)
        .map((c) => ({
          id: c.id,
          courseId: c.courseId,
          courseName: c.courseName,
        }))
        .sort((a, b) =>
          `${a.courseId} - ${a.courseName}`.localeCompare(`${b.courseId} - ${b.courseName}`),
        );
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

  getSingleTutor: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: {
        username: input,
      },
      include: {
        availability: true,
        bookings: true
      }
    });

    if (user) return user;

    return ctx.db.user.findUnique({
      where: {
        clerkId: input,
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
        approved: true,
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
        // Verify tutor exists (no longer require Stripe account for booking)
        const tutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { id: true, firstName: true, lastName: true }
        });

        if (!tutor) {
          throw new Error('Tutor not found');
        }

        // Calculate platform fee (10% of the total amount)
        const platformFee = Math.round(amount * 0.10);
        const tutorAmount = amount - platformFee;

        console.log(`Payment breakdown: Total: $${amount/100}, Platform fee: $${platformFee/100}, Tutor receives: $${tutorAmount/100}`);

        // Create a PaymentIntent WITHOUT transfer_data (Separate Charges and Transfers)
        // Funds go to platform account, then transferred to mentor on withdraw
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          // No transfer_data - funds stay in platform account
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
          paymentIntentId: paymentIntent.id,
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
        studentEmail: z.string().optional(),
        studentName: z.string().optional(),
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
      const { tutorId, studentClerkId, studentEmail, studentName, date, time, status, free } = input;

      // Convert date string to DateTime (normalized to midnight UTC to match unique composite)
      const bookingDate = new Date(date);
      const normalizedDate = new Date(bookingDate.toISOString().split('T')[0] ?? date);

      // Guard: prevent abuse of free first sessions
      if (free) {
        const freeSessionWhere: Record<string, unknown>[] = [];

        // Check by student Clerk ID (logged-in users)
        if (studentClerkId) {
          freeSessionWhere.push({ studentClerkId });
        }

        // Check by student email (guest or logged-in)
        if (studentEmail) {
          freeSessionWhere.push({ studentEmail: studentEmail.toLowerCase().trim() });
        }

        if (freeSessionWhere.length > 0) {
          const existingFree = await ctx.db.booking.findFirst({
            where: {
              tutorId,
              free: true,
              OR: freeSessionWhere,
            },
            select: { id: true },
          });

          if (existingFree) {
            throw new Error('You have already used your free first session with this tutor.');
          }
        }
      }

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
            studentEmail: studentEmail?.toLowerCase().trim(),
            studentName,
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

        // Extract payment amounts from metadata
        const totalAmount = paymentIntent.amount;
        const platformFee = parseInt(paymentIntent.metadata.platformFee ?? '0', 10);
        const tutorAmount = parseInt(paymentIntent.metadata.tutorAmount ?? '0', 10);

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

        // Get tutor email for calendar integration
        const tutorData = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { email: true }
        });

        // Create booking, credit tutor wallet, and mark as completed in one transaction.
        // This must happen here (not in the Stripe webhook) because the webhook fires
        // before this mutation creates the booking, so it finds nothing and exits early.
        const HOLD_DAYS = 7;
        const availableAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);

        const result = await ctx.db.$transaction(async (tx) => {
          const booking = await tx.booking.create({
            data: {
              tutorId,
              studentClerkId,
              date: normalizedDate,
              time,
              status: 'completed',
              stripePaymentIntentId: paymentIntentId,
              totalAmountCents: totalAmount,
              platformFeeCents: platformFee,
              mentorEarningsCents: tutorAmount,
              earningsProcessed: true,
              availableAt,
              fundsReleased: false,
              studentEmail,
              studentName,
              tutorEmail: tutorData?.email,
            }
          });

          if (tutorAmount > 0) {
            let wallet = await tx.mentorWallet.findUnique({
              where: { mentorId: tutorId },
            });

            if (!wallet) {
              wallet = await tx.mentorWallet.create({
                data: { mentorId: tutorId, availableCents: 0, pendingCents: 0 },
              });
            }

            const newPending = wallet.pendingCents + tutorAmount;

            await tx.mentorWallet.update({
              where: { mentorId: tutorId },
              data: { pendingCents: newPending },
            });

            await tx.mentorLedgerEntry.create({
              data: {
                mentorId: tutorId,
                type: 'SESSION_EARNED',
                amountCents: tutorAmount,
                balanceAfterCents: newPending,
                relatedSessionId: booking.id,
                stripePaymentIntentId: paymentIntentId,
                description: `Earnings from session on ${normalizedDate.toLocaleDateString()} (available ${availableAt.toLocaleDateString()})`,
              },
            });
          }

          return booking;
        });

        console.log('Booking created with payment info and wallet credited:', result.id);

        // Get tutor information for email
        const tutor = await ctx.db.user.findUnique({
          where: { clerkId: tutorId },
          select: { firstName: true, lastName: true, email: true, meetingLink: true, timezone: true }
        });

        return { 
          success: true, 
          message: 'Session booked successfully', 
          bookingId: result.id,
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
              username: true,
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

  // ============= MENTOR WALLET & EARNINGS SYSTEM =============

  // Get mentor's wallet balance and recent ledger entries
  getMentorWallet: publicProcedure
    .input(z.string()) // mentorClerkId
    .query(async ({ ctx, input }) => {
      const mentorId = input;

      // Release any matured pending earnings before returning wallet data
      await releasePendingEarnings(mentorId);

      // Get or create wallet
      let wallet = await ctx.db.mentorWallet.findUnique({
        where: { mentorId },
      });

      if (!wallet) {
        wallet = await ctx.db.mentorWallet.create({
          data: {
            mentorId,
            availableCents: 0,
            pendingCents: 0,
          },
        });
      }

      // Get recent ledger entries
      const ledgerEntries = await ctx.db.mentorLedgerEntry.findMany({
        where: { mentorId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Get pending payouts
      const pendingPayouts = await ctx.db.mentorPayout.findMany({
        where: {
          mentorId,
          status: { in: ['INITIATED', 'REQUIRES_ONBOARDING', 'PROCESSING'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get bookings still in the hold period (funds not yet released)
      const pendingEarnings = await ctx.db.booking.findMany({
        where: {
          tutorId: mentorId,
          earningsProcessed: true,
          fundsReleased: false,
          mentorEarningsCents: { gt: 0 },
        },
        select: {
          id: true,
          mentorEarningsCents: true,
          availableAt: true,
          date: true,
          time: true,
          studentName: true,
        },
        orderBy: { availableAt: 'asc' },
      });

      return {
        wallet,
        ledgerEntries,
        pendingPayouts,
        pendingEarnings,
      };
    }),

  // Get completed sessions that haven't had earnings processed yet
  getUnprocessedEarnings: publicProcedure
    .input(z.string()) // mentorClerkId
    .query(async ({ ctx, input }) => {
      return ctx.db.booking.findMany({
        where: {
          tutorId: input,
          status: 'completed',
          free: false,
          earningsProcessed: false,
          mentorEarningsCents: { not: null },
        },
        orderBy: { date: 'desc' },
      });
    }),

  // Mark a session as completed and add earnings to mentor's wallet
  // This would be called when a session is marked as completed
  completeSessionAndAddEarnings: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
        mentorClerkId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bookingId, mentorClerkId } = input;

      // Get booking
      const booking = await ctx.db.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.tutorId !== mentorClerkId) {
        throw new Error('Not authorized to complete this session');
      }

      if (booking.earningsProcessed) {
        throw new Error('Earnings already processed for this session');
      }

      if (booking.free || !booking.mentorEarningsCents) {
        throw new Error('No earnings to process for this session');
      }

      // Use a transaction for safety
      const result = await ctx.db.$transaction(async (tx) => {
        // Get or create wallet
        let wallet = await tx.mentorWallet.findUnique({
          where: { mentorId: mentorClerkId },
        });

        if (!wallet) {
          wallet = await tx.mentorWallet.create({
            data: {
              mentorId: mentorClerkId,
              availableCents: 0,
              pendingCents: 0,
            },
          });
        }

        // Add to available balance
        const newAvailableBalance = wallet.availableCents + booking.mentorEarningsCents!;

        // Update wallet
        const updatedWallet = await tx.mentorWallet.update({
          where: { mentorId: mentorClerkId },
          data: {
            availableCents: newAvailableBalance,
          },
        });

        // Create ledger entry
        await tx.mentorLedgerEntry.create({
          data: {
            mentorId: mentorClerkId,
            type: 'SESSION_EARNED',
            amountCents: booking.mentorEarningsCents!,
            balanceAfterCents: newAvailableBalance,
            relatedSessionId: bookingId,
            stripePaymentIntentId: booking.stripePaymentIntentId,
            description: `Earnings from session on ${booking.date.toLocaleDateString()}`,
          },
        });

        // Mark booking as completed and earnings processed
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'completed',
            earningsProcessed: true,
          },
        });

        return updatedWallet;
      });

      return { success: true, wallet: result };
    }),

  // Request a withdrawal - creates Stripe Connect account if needed
  withdrawEarnings: publicProcedure
    .input(
      z.object({
        mentorClerkId: z.string(),
        amountCents: z.number().optional(), // If not provided, withdraw all available
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { mentorClerkId, amountCents: requestedAmount } = input;

      // Release any matured pending earnings before checking balance
      await releasePendingEarnings(mentorClerkId);

      // Get mentor data
      const mentor = await ctx.db.user.findUnique({
        where: { clerkId: mentorClerkId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
        },
      });

      if (!mentor) {
        throw new Error('Mentor not found');
      }

      // Get wallet
      const wallet = await ctx.db.mentorWallet.findUnique({
        where: { mentorId: mentorClerkId },
      });

      if (!wallet || wallet.availableCents <= 0) {
        throw new Error('No available balance to withdraw');
      }

      // Determine amount to withdraw
      const withdrawAmount = requestedAmount 
        ? Math.min(requestedAmount, wallet.availableCents)
        : wallet.availableCents;

      if (withdrawAmount <= 0) {
        throw new Error('Invalid withdrawal amount');
      }

      // Generate idempotency key for this withdrawal
      const idempotencyKey = `withdraw_${mentorClerkId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Check if mentor has a Stripe Connect account
      if (!mentor.stripeAccountId) {
        // Create Stripe Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: mentor.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          individual: {
            first_name: mentor.firstName,
            last_name: mentor.lastName,
            email: mentor.email,
          },
        });

        // Update mentor record with Stripe account ID
        await ctx.db.user.update({
          where: { clerkId: mentorClerkId },
          data: {
            stripeAccountId: account.id,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeRequirements: account.requirements as any,
          },
        });

        // Create payout record with REQUIRES_ONBOARDING status
        const payout = await ctx.db.mentorPayout.create({
          data: {
            mentorId: mentorClerkId,
            amountCents: withdrawAmount,
            status: 'REQUIRES_ONBOARDING',
            idempotencyKey,
          },
        });

        // Create ledger entry
        await ctx.db.mentorLedgerEntry.create({
          data: {
            mentorId: mentorClerkId,
            type: 'WITHDRAW_REQUESTED',
            amountCents: -withdrawAmount,
            balanceAfterCents: wallet.availableCents - withdrawAmount,
            relatedPayoutId: payout.id,
            description: 'Withdrawal requested - Stripe onboarding required',
          },
        });

        // Deduct from available balance (held until onboarding complete)
        await ctx.db.mentorWallet.update({
          where: { mentorId: mentorClerkId },
          data: {
            availableCents: wallet.availableCents - withdrawAmount,
            pendingCents: wallet.pendingCents + withdrawAmount,
          },
        });

        // Create account link for onboarding
        const baseUrl = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
          ? 'http://localhost:3000' 
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${baseUrl}/earnings?refresh=true`,
          return_url: `${baseUrl}/earnings?onboarding=complete&payoutId=${payout.id}`,
          type: 'account_onboarding',
        });

        return {
          success: true,
          requiresOnboarding: true,
          onboardingUrl: accountLink.url,
          payoutId: payout.id,
          message: 'Please complete Stripe onboarding to receive your funds',
        };
      }

      // Check if account is fully onboarded
      const account = await stripe.accounts.retrieve(mentor.stripeAccountId);
      
      // Update account status in DB
      await ctx.db.user.update({
        where: { clerkId: mentorClerkId },
        data: {
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeRequirements: account.requirements as any,
        },
      });

      if (!account.payouts_enabled) {
        // Create payout record with REQUIRES_ONBOARDING status
        const payout = await ctx.db.mentorPayout.create({
          data: {
            mentorId: mentorClerkId,
            amountCents: withdrawAmount,
            status: 'REQUIRES_ONBOARDING',
            idempotencyKey,
          },
        });

        // Create ledger entry
        await ctx.db.mentorLedgerEntry.create({
          data: {
            mentorId: mentorClerkId,
            type: 'WITHDRAW_REQUESTED',
            amountCents: -withdrawAmount,
            balanceAfterCents: wallet.availableCents - withdrawAmount,
            relatedPayoutId: payout.id,
            description: 'Withdrawal requested - additional verification required',
          },
        });

        // Deduct from available balance
        await ctx.db.mentorWallet.update({
          where: { mentorId: mentorClerkId },
          data: {
            availableCents: wallet.availableCents - withdrawAmount,
            pendingCents: wallet.pendingCents + withdrawAmount,
          },
        });

        // Create account link for continued onboarding
        const baseUrl = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
          ? 'http://localhost:3000' 
          : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

        const accountLink = await stripe.accountLinks.create({
          account: mentor.stripeAccountId,
          refresh_url: `${baseUrl}/earnings?refresh=true`,
          return_url: `${baseUrl}/earnings?onboarding=complete&payoutId=${payout.id}`,
          type: 'account_onboarding',
        });

        return {
          success: true,
          requiresOnboarding: true,
          onboardingUrl: accountLink.url,
          payoutId: payout.id,
          message: 'Please complete additional verification to receive your funds',
        };
      }

      // Account is ready - create the transfer
      const result = await ctx.db.$transaction(async (tx) => {
        // Create payout record
        const payout = await tx.mentorPayout.create({
          data: {
            mentorId: mentorClerkId,
            amountCents: withdrawAmount,
            status: 'PROCESSING',
            idempotencyKey,
          },
        });

        try {
          // Create Stripe transfer
          const transfer = await stripe.transfers.create({
            amount: withdrawAmount,
            currency: 'usd',
            destination: mentor.stripeAccountId!,
            metadata: {
              mentorClerkId,
              payoutId: payout.id,
            },
          }, {
            idempotencyKey,
          });

          // Update payout with transfer ID
          await tx.mentorPayout.update({
            where: { id: payout.id },
            data: {
              status: 'PAID',
              stripeTransferId: transfer.id,
            },
          });

          // Create ledger entries
          await tx.mentorLedgerEntry.create({
            data: {
              mentorId: mentorClerkId,
              type: 'WITHDRAW_REQUESTED',
              amountCents: -withdrawAmount,
              balanceAfterCents: wallet.availableCents - withdrawAmount,
              relatedPayoutId: payout.id,
              description: 'Withdrawal processed',
            },
          });

          await tx.mentorLedgerEntry.create({
            data: {
              mentorId: mentorClerkId,
              type: 'TRANSFER_CREATED',
              amountCents: withdrawAmount,
              relatedPayoutId: payout.id,
              stripeTransferId: transfer.id,
              description: `Transfer sent to bank account`,
            },
          });

          // Update wallet
          await tx.mentorWallet.update({
            where: { mentorId: mentorClerkId },
            data: {
              availableCents: wallet.availableCents - withdrawAmount,
            },
          });

          return {
            success: true,
            requiresOnboarding: false,
            payoutId: payout.id,
            transferId: transfer.id,
            amountCents: withdrawAmount,
            message: 'Withdrawal successful! Funds are on their way.',
          };
        } catch (error: any) {
          // Transfer failed - update payout and restore balance
          await tx.mentorPayout.update({
            where: { id: payout.id },
            data: {
              status: 'FAILED',
              failureReason: error.message,
            },
          });

          await tx.mentorLedgerEntry.create({
            data: {
              mentorId: mentorClerkId,
              type: 'TRANSFER_FAILED',
              amountCents: 0,
              relatedPayoutId: payout.id,
              description: `Transfer failed: ${error.message}`,
            },
          });

          throw new Error(`Transfer failed: ${error.message}`);
        }
      });

      return result;
    }),

  // Process pending payout after onboarding is complete
  processPendingPayout: publicProcedure
    .input(
      z.object({
        payoutId: z.string(),
        mentorClerkId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { payoutId, mentorClerkId } = input;

      // Get payout
      const payout = await ctx.db.mentorPayout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.mentorId !== mentorClerkId) {
        throw new Error('Not authorized');
      }

      if (payout.status !== 'REQUIRES_ONBOARDING') {
        throw new Error('Payout is not awaiting onboarding');
      }

      // Get mentor
      const mentor = await ctx.db.user.findUnique({
        where: { clerkId: mentorClerkId },
        select: { stripeAccountId: true },
      });

      if (!mentor?.stripeAccountId) {
        throw new Error('Stripe account not found');
      }

      // Check account status
      const account = await stripe.accounts.retrieve(mentor.stripeAccountId);

      if (!account.payouts_enabled) {
        return {
          success: false,
          message: 'Please complete additional verification steps',
        };
      }

      // Get wallet
      const wallet = await ctx.db.mentorWallet.findUnique({
        where: { mentorId: mentorClerkId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Process the transfer
      try {
        const transfer = await stripe.transfers.create({
          amount: payout.amountCents,
          currency: 'usd',
          destination: mentor.stripeAccountId,
          metadata: {
            mentorClerkId,
            payoutId: payout.id,
          },
        }, {
          idempotencyKey: payout.idempotencyKey,
        });

        // Update records
        await ctx.db.$transaction(async (tx) => {
          await tx.mentorPayout.update({
            where: { id: payoutId },
            data: {
              status: 'PAID',
              stripeTransferId: transfer.id,
            },
          });

          await tx.mentorLedgerEntry.create({
            data: {
              mentorId: mentorClerkId,
              type: 'TRANSFER_CREATED',
              amountCents: payout.amountCents,
              relatedPayoutId: payoutId,
              stripeTransferId: transfer.id,
              description: 'Transfer sent after onboarding',
            },
          });

          // Move from pending to completed (reduce pending balance)
          await tx.mentorWallet.update({
            where: { mentorId: mentorClerkId },
            data: {
              pendingCents: wallet.pendingCents - payout.amountCents,
            },
          });
        });

        return {
          success: true,
          transferId: transfer.id,
          message: 'Transfer successful!',
        };
      } catch (error: any) {
        // Update payout as failed
        await ctx.db.mentorPayout.update({
          where: { id: payoutId },
          data: {
            status: 'FAILED',
            failureReason: error.message,
          },
        });

        // Return pending amount to available
        await ctx.db.mentorWallet.update({
          where: { mentorId: mentorClerkId },
          data: {
            availableCents: wallet.availableCents + payout.amountCents,
            pendingCents: wallet.pendingCents - payout.amountCents,
          },
        });

        await ctx.db.mentorLedgerEntry.create({
          data: {
            mentorId: mentorClerkId,
            type: 'TRANSFER_FAILED',
            amountCents: 0,
            relatedPayoutId: payoutId,
            description: `Transfer failed: ${error.message}`,
          },
        });

        throw new Error(`Transfer failed: ${error.message}`);
      }
    }),

  // Get Stripe onboarding link (for continuing incomplete onboarding)
  getStripeOnboardingLink: publicProcedure
    .input(z.string()) // mentorClerkId
    .mutation(async ({ ctx, input }) => {
      const mentorClerkId = input;

      const mentor = await ctx.db.user.findUnique({
        where: { clerkId: mentorClerkId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          stripeAccountId: true,
        },
      });

      if (!mentor) {
        throw new Error('Mentor not found');
      }

      let accountId = mentor.stripeAccountId;

      // Create account if doesn't exist
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: mentor.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          individual: {
            first_name: mentor.firstName,
            last_name: mentor.lastName,
            email: mentor.email,
          },
        });

        accountId = account.id;

        await ctx.db.user.update({
          where: { clerkId: mentorClerkId },
          data: {
            stripeAccountId: account.id,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeRequirements: account.requirements as any,
          },
        });
      }

      const baseUrl = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
        ? 'http://localhost:3000' 
        : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/earnings?refresh=true`,
        return_url: `${baseUrl}/earnings?onboarding=complete`,
        type: 'account_onboarding',
      });

      return {
        url: accountLink.url,
        accountId,
      };
    }),

  // Get mentor's Stripe account status
  getMentorStripeStatus: publicProcedure
    .input(z.string()) // mentorClerkId
    .query(async ({ ctx, input }) => {
      const mentor = await ctx.db.user.findUnique({
        where: { clerkId: input },
        select: {
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeRequirements: true,
        },
      });

      if (!mentor?.stripeAccountId) {
        return {
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          requirements: null,
        };
      }

      // Fetch latest from Stripe
      const account = await stripe.accounts.retrieve(mentor.stripeAccountId);

      // Update DB
      await ctx.db.user.update({
        where: { clerkId: input },
        data: {
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeRequirements: account.requirements as any,
        },
      });

      return {
        hasAccount: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
      };
    }),

  // Get mentor's payout history
  getPayoutHistory: publicProcedure
    .input(z.string()) // mentorClerkId
    .query(async ({ ctx, input }) => {
      return ctx.db.mentorPayout.findMany({
        where: { mentorId: input },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }),

  // ============= ADMIN DASHBOARD =============

  // Get admin dashboard stats
  getAdminDashboardStats: publicProcedure
    .input(z.string()) // adminClerkId for authorization
    .query(async ({ ctx, input }) => {
      // Check if user is an admin
      const adminIds = (process.env.ADMIN_CLERK_IDS ?? '').split(',').map(id => id.trim());
      if (!adminIds.includes(input)) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all mentor wallets - money owed to mentors
      const wallets = await ctx.db.mentorWallet.findMany({
        select: {
          availableCents: true,
          pendingCents: true,
          mentor: {
            select: {
              firstName: true,
              lastName: true,
              clerkId: true,
            },
          },
        },
      });

      const totalOwedToMentors = wallets.reduce(
        (sum, w) => sum + w.availableCents + w.pendingCents,
        0
      );
      const totalAvailableToMentors = wallets.reduce(
        (sum, w) => sum + w.availableCents,
        0
      );
      const totalPendingToMentors = wallets.reduce(
        (sum, w) => sum + w.pendingCents,
        0
      );

      // Get booking stats
      const bookings = await ctx.db.booking.findMany({
        where: {
          free: false,
          totalAmountCents: { not: null },
        },
        select: {
          totalAmountCents: true,
          platformFeeCents: true,
          mentorEarningsCents: true,
          earningsProcessed: true,
          createdAt: true,
        },
      });

      const totalBookings = await ctx.db.booking.count({
        where: { free: false },
      });
      const freeBookings = await ctx.db.booking.count({
        where: { free: true },
      });

      const totalRevenue = bookings.reduce(
        (sum, b) => sum + (b.totalAmountCents ?? 0),
        0
      );
      const totalPlatformFees = bookings.reduce(
        (sum, b) => sum + (b.platformFeeCents ?? 0),
        0
      );
      const totalMentorEarnings = bookings.reduce(
        (sum, b) => sum + (b.mentorEarningsCents ?? 0),
        0
      );

      // Get completed payouts to mentors
      const completedPayouts = await ctx.db.mentorPayout.aggregate({
        where: { status: 'PAID' },
        _sum: { amountCents: true },
        _count: true,
      });

      // Get pending/processing payouts
      const pendingPayouts = await ctx.db.mentorPayout.findMany({
        where: {
          status: { in: ['INITIATED', 'REQUIRES_ONBOARDING', 'PROCESSING'] },
        },
        include: {
          mentor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate safe to withdraw
      // Platform keeps: total revenue - total owed to mentors - already paid out
      const alreadyPaidToMentors = completedPayouts._sum.amountCents ?? 0;
      const safeToWithdraw = totalPlatformFees;

      // Get mentor breakdown for detailed view
      const mentorBreakdown = wallets
        .filter(w => w.availableCents > 0 || w.pendingCents > 0)
        .map(w => ({
          name: `${w.mentor.firstName} ${w.mentor.lastName}`,
          clerkId: w.mentor.clerkId,
          available: w.availableCents,
          pending: w.pendingCents,
          total: w.availableCents + w.pendingCents,
        }))
        .sort((a, b) => b.total - a.total);

      // Get recent bookings for activity
      const recentBookings = await ctx.db.booking.findMany({
        where: { free: false },
        include: {
          tutor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        // Summary stats
        totalOwedToMentors,
        totalAvailableToMentors,
        totalPendingToMentors,
        safeToWithdraw,
        
        // Booking stats
        totalBookings,
        freeBookings,
        paidBookings: totalBookings,
        totalRevenue,
        totalPlatformFees,
        totalMentorEarnings,
        
        // Payout stats
        alreadyPaidToMentors,
        completedPayoutCount: completedPayouts._count,
        pendingPayouts,
        
        // Detailed breakdowns
        mentorBreakdown,
        recentBookings: recentBookings.map(b => ({
          id: b.id,
          tutorName: `${b.tutor.firstName} ${b.tutor.lastName}`,
          date: b.date,
          time: b.time,
          totalAmount: b.totalAmountCents,
          platformFee: b.platformFeeCents,
          mentorEarnings: b.mentorEarningsCents,
          earningsProcessed: b.earningsProcessed,
          createdAt: b.createdAt,
        })),
      };
    }),

});
