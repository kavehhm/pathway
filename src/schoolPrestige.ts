/**
 * School prestige rankings - lower number = more prestigious
 * Schools not in this list get a default rank of 999
 */
export const schoolPrestigeRank: Record<string, number> = {
  // Top tier
  "Princeton University": 1,
  "Massachusetts Institute of Technology (MIT)": 2,
  "Harvard University": 3,
  "Stanford University": 4,
  "Yale University": 5,
  "University of Chicago": 6,
  "Duke University": 7,
  "Johns Hopkins University": 8,
  "Northwestern University": 9,
  "University of Pennsylvania": 10,
  "California Institute of Technology (Caltech)": 11,
  "Cornell University": 12,
  "Brown University": 13,
  "Dartmouth College": 14,
  "Columbia University": 15,
  "University of California, Berkeley": 16,
  "Rice University": 17,
  "University of California, Los Angeles (UCLA)": 18,
  "Vanderbilt University": 19,
  "Carnegie Mellon University": 20,
  "University of Michigan": 21,
  "University of Notre Dame": 22,
  "Washington University in St. Louis": 23,
  "Emory University": 24,
  "Georgetown University": 25,
  "University of North Carolina at Chapel Hill": 26,
  "University of Virginia": 27,
  "University of Southern California (USC)": 28,
  "University of California, San Diego (UCSD)": 29,
  "University of Florida": 30,
  "University of Texas at Austin": 31,
  "Georgia Institute of Technology": 32,
  "New York University (NYU)": 33,
  "University of California, Davis (UCD)": 34,
  "University of California, Irvine (UCI)": 35,
  "Boston College": 36,
  "Tufts University": 37,
  "University of Illinois Urbana-Champaign": 38,
  "University of Wisconsin-Madison": 39,
  "University of California, Santa Barbara (UCSB)": 40,
  "Ohio State University": 41,
  "Boston University": 42,
  "Rutgers, The State University of New Jersey": 43,
  "University of Maryland, College Park": 44,
  "University of Washington": 45,
  "Lehigh University": 46,
  "Northeastern University": 47,
  "Purdue University": 48,
  "University of Georgia": 49,
  "University of Rochester": 50,
  "Case Western Reserve University": 51,
  "Florida State University": 52,
  "Texas A&M University": 53,
  "Virginia Tech": 54,
  "Wake Forest University": 55,
  "William & Mary": 56,
  "University of California, Merced (UCM)": 57,
  "University of California, Santa Cruz (UCSC)": 58,
  "University of California, Riverside (UCR)": 59,
  "Villanova University": 60,
  "George Washington University": 61,
  "Pennsylvania State University": 62,
  "Santa Clara University": 63,
  "Stony Brook University": 64,
  "University of Minnesota Twin Cities": 65,
  "Michigan State University": 66,
};

/**
 * Get the prestige rank for a school
 * Returns 999 for schools not in the ranking (shown last)
 */
export function getSchoolPrestigeRank(school: string | null | undefined): number {
  if (!school) return 999;
  return schoolPrestigeRank[school] ?? 999;
}
