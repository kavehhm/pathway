import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Read Northwestern courses CSV
  const csvPath = path.join(__dirname, '../public/course catalogs/northwestern_undergrad_courses_ALL.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV (skip header row)
  const lines = csvContent.split('\n').slice(1);
  const courses = lines
    .filter(line => line.trim())
    .map(line => {
      // Handle CSV parsing with potential commas in quotes
      const match = line.match(/^"([^"]*?)","([^"]*?)"/);
      if (match && match[1] && match[2]) {
        return {
          courseId: match[1].trim(),
          courseName: match[2].trim(),
        };
      }
      // Fallback for simple comma-separated
      const [courseId, courseName] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      return { courseId: courseId ?? '', courseName: courseName ?? '' };
    })
    .filter(course => course.courseId && course.courseName);

  console.log(`📚 Found ${courses.length} Northwestern courses to seed`);

  // Insert courses
  let insertedCount = 0;
  let skippedCount = 0;

  for (const course of courses) {
    try {
      await prisma.course.upsert({
        where: {
          courseId_school: {
            courseId: course.courseId,
            school: 'Northwestern University',
          },
        },
        update: {
          courseName: course.courseName,
        },
        create: {
          courseId: course.courseId,
          courseName: course.courseName,
          school: 'Northwestern University',
        },
      });
      insertedCount++;
      
      if (insertedCount % 100 === 0) {
        console.log(`  ✓ Processed ${insertedCount} courses...`);
      }
    } catch (error) {
      console.error(`  ✗ Error inserting course ${course.courseId}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Inserted/Updated: ${insertedCount} courses`);
  console.log(`   Skipped: ${skippedCount} courses`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

