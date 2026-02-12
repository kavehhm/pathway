import React, { useState } from 'react';

interface OnboardingProgressBarProps {
  username: string | undefined;
  bio: string | undefined;
  description: string | undefined;
  school: string | undefined;
  major: string | undefined;
  gpa: number | undefined;
  subjects: string[] | undefined;
  hourlyRate: number | undefined;
  availability: any[] | undefined;
  meetingLink: string | undefined;
  stripeAccountStatus?: string | null | undefined; // Optional - no longer required for onboarding
  imageSrc: string | undefined;
}

const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  username,
  bio,
  description,
  school,
  major,
  gpa,
  subjects,
  hourlyRate,
  availability,
  meetingLink,
  imageSrc,
}) => {
  // Calculate completion for each section
  // Note: Payment setup is now done separately via the Earnings page
  // Note: Meeting Link is now OPTIONAL - if not provided, Google Meet will be auto-generated
  const checks = [
    { label: 'Profile Picture', completed: !!imageSrc && imageSrc !== '' && !imageSrc.includes('gravatar') },
    { label: 'Username', completed: !!username && username !== 'None' },
    { label: 'Hourly Rate', completed: !!hourlyRate && hourlyRate > 0 },
    { label: 'Bio', completed: !!bio && bio !== 'None' },
    { label: 'About/Description', completed: !!description && description !== 'None' },
    { label: 'University', completed: !!school && school !== 'None' },
    { label: 'Major', completed: !!major && major !== 'None' },
    { label: 'GPA', completed: !!gpa && gpa > 0 },
    { label: 'Subjects', completed: !!subjects && subjects.length > 0 },
    { 
      label: 'Availability', 
      completed: !!availability && availability.some(day => day.available && day.startTime && day.endTime)
    },
    // Meeting link is optional - always counts as completed
    // If not provided, Google Meet link will be auto-generated at booking time
    { label: 'Meeting Link (Optional)', completed: true },
  ];

  const completedCount = checks.filter(check => check.completed).length;
  const totalCount = checks.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <>
      {/* Mobile: compact, non-blocking progress card */}
      <MobileOnboardingProgress
        progressPercentage={progressPercentage}
        checks={checks}
      />

      {/* Desktop: fixed sidebar */}
      <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 z-20">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Onboarding Progress</h3>
            <span className="text-2xl font-bold text-indigo-600">{progressPercentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center gap-3 group">
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                  check.completed ? 'bg-green-500' : 'bg-gray-300 group-hover:bg-gray-400'
                }`}
              >
                {check.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-200 ${
                  check.completed ? 'text-gray-700 font-medium' : 'text-gray-500'
                }`}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>

        {progressPercentage === 100 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-green-800">
                Profile complete! Click &quot;Update Profile&quot; to go live.
              </p>
            </div>
          </div>
        )}

        {progressPercentage < 100 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              Complete all items and save to be visible to students.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default OnboardingProgressBar;

function MobileOnboardingProgress({
  progressPercentage,
  checks,
}: {
  progressPercentage: number;
  checks: { label: string; completed: boolean }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden relative z-20 mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Profile progress</p>
            <p className="text-xs text-gray-500">Complete these to be visible to students.</p>
          </div>
          <span className="text-xl font-bold text-indigo-600">{progressPercentage}%</span>
        </div>

        <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center text-sm font-semibold text-violet-700 hover:text-violet-800"
        >
          {open ? "Hide checklist" : "Show checklist"}
          <span className="ml-2 text-xs text-violet-700">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    check.completed ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  {check.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${check.completed ? "text-gray-800" : "text-gray-500"}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

