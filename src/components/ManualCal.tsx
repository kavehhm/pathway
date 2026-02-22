import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PaymentForm from './PaymentForm';
import { getCurrentTimezone, convertTimeBetweenTimezones } from '~/utils/timezones';
import { useUser } from '@clerk/nextjs';

interface ManualCalProps {
  userId: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// Robust helpers to avoid non-ISO Date parsing issues on mobile browsers
function parse12HourTimeToMinutes(timeStr: string): number | null {
  // Expected formats like "9:00 AM" or "12:30 PM"
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const period = (match[3] ?? 'AM').toUpperCase();
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }
  let hour24 = hours % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + minutes;
}

function formatMinutesTo12Hour(totalMinutes: number): string {
  const minutesNormalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hours24 = Math.floor(minutesNormalized / 60);
  const minutes = minutesNormalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  if (hours24 === 0) hours24 = 12; // 0 -> 12 AM
  if (hours24 > 12) hours24 -= 12; // 13-23 -> 1-11 PM
  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours24}:${minutesStr} ${period}`;
}

const ManualCal: React.FC<ManualCalProps> = ({ userId }) => {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentTimezone, setStudentTimezone] = useState('PST');
  const [isFirstSession, setIsFirstSession] = useState(false);
  const paymentSectionRef = React.useRef<HTMLDivElement>(null);

  
  // Fetch tutor availability using tRPC
//   const { data: tutorData, isLoading, error } = api.post.getTutor.useQuery(userId, {
//     enabled: !!userId, // Only run query if userId is provided
//   });
  const tutor = api.post.getSingleTutor.useQuery(userId);
  const createBooking = api.post.createBooking.useMutation();

  // Debug logging for tutor data
  useEffect(() => {
    if (tutor.data) {
      console.log('Full tutor data:', tutor.data);
      console.log('Tutor ID:', userId);
      console.log('Tutor username:', tutor.data.username);
      console.log('Tutor timezone:', tutor.data.timezone);
      console.log('Student timezone:', studentTimezone);
      console.log('Availability array:', tutor.data.availability);
      console.log('Bookings array:', tutor.data.bookings);
      console.log('Total bookings found:', tutor.data.bookings?.length ?? 0);
      
      // Test Wednesday availability specifically
      const wednesdayAvailability = tutor.data.availability?.find(avail => avail.day === 'Wednesday');
      console.log('Wednesday availability:', wednesdayAvailability);
      console.log('Is Wednesday available?', wednesdayAvailability?.available);
    } else if (tutor.error) {
      console.log('Query error:', tutor.error);
    } else if (tutor.isLoading) {
      console.log('Loading tutor data...');
    } else {
      console.log('No tutor data found for ID:', userId);
    }
  }, [tutor, userId, studentTimezone]);

  // Generate available dates for the next 30 days
  useEffect(() => {
    if (tutor.data?.availability) {
      console.log('Tutor availability object:', tutor.data.availability);
      
      const dates: Date[] = [];
      const today = new Date();
      
      // Get all available weekdays from the tutor's availability
      const availableWeekdays = tutor.data.availability
        .filter(avail => avail.available)
        .map(avail => avail.day);
      
      console.log('Available weekdays:', availableWeekdays);
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if this weekday is in the available weekdays
        if (availableWeekdays.includes(dayName)) {
          dates.push(date);
        }
      }
      
      console.log('Generated available dates:', dates);
      setAvailableDates(dates);
    }
  }, [tutor.data]);

  // Generate time slots based on selected date
  useEffect(() => {
    if (selectedDate && tutor.data?.availability) {
      const selectedDay = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayAvailabilities = tutor.data.availability.filter(
        (avail) => avail.day === selectedDay && avail.available
      );

      console.log('Selected date:', selectedDate);
      console.log('Selected day:', selectedDay);
      console.log('Day availabilities:', dayAvailabilities);
      console.log('Student timezone:', studentTimezone);
      console.log('Tutor timezone:', tutor.data?.timezone);

      if (dayAvailabilities.length > 0) {
        console.log('Day availabilities for', selectedDay, ':', dayAvailabilities);
        
        let allTimeSlots: TimeSlot[] = [];
        const normalizedStudentTz = (studentTimezone || 'PST').toUpperCase();
        
        // Process all availability entries for this day
        dayAvailabilities.forEach((dayAvailability, index) => {
          if (dayAvailability.timeRange) {
            // Parse time range (accept regular/en/em dashes and variable spaces)
            const parts = String(dayAvailability.timeRange)
              .replace(/[–—]/g, '-')
              .split(/\s*-\s*/);
            const startTime = parts[0];
            const endTime = parts[1];
            
            console.log(`Time range ${index + 1}:`, startTime, 'to', endTime);
            
            // Generate time slots every hour for this time range using robust parsing
            if (!startTime || !endTime) {
              console.warn('Invalid timeRange format, expected "HH:MM AM/PM - HH:MM AM/PM" but got:', dayAvailability.timeRange);
              return;
            }
            const startMinutes = parse12HourTimeToMinutes(startTime ?? '');
            const endMinutes = parse12HourTimeToMinutes(endTime ?? '');
            if (startMinutes == null || endMinutes == null) {
              console.warn('Failed to parse time range:', { startTime, endTime });
              return;
            }
            for (let cur = startMinutes; cur < endMinutes; cur += 60) {
              const timeString = formatMinutesTo12Hour(cur);
              
              console.log('Original time string (manual format):', timeString);
              console.log('User agent:', navigator.userAgent);
              
              // Always convert time from tutor's timezone to student's timezone
              const displayTime = convertTimeBetweenTimezones(
                timeString,
                (tutor.data?.timezone ?? 'PST').toUpperCase(),
                normalizedStudentTz
              );
              
              console.log('Converted time:', displayTime);
              console.log('Conversion details:', {
                originalTime: timeString,
                fromTimezone: (tutor.data?.timezone ?? 'PST').toUpperCase(),
                toTimezone: studentTimezone,
                convertedTime: displayTime
              });
              
              // Validate the converted time format (mobile devices sometimes return unexpected formats)
              const timeValidationRegex = /^\d{1,2}:\d{2} (AM|PM)$/;
              if (!timeValidationRegex.test(displayTime)) {
                console.warn('Invalid time format detected:', displayTime, 'Using original time as fallback');
                // Use original time if conversion failed
                if (!allTimeSlots.some(slot => slot.time === timeString)) {
                  allTimeSlots.push({
                    time: timeString,
                    available: true
                  });
                }
              } else {
                // Only add if not already in the list (avoid duplicates)
                if (!allTimeSlots.some(slot => slot.time === displayTime)) {
                  allTimeSlots.push({
                    time: displayTime,
                    available: true
                  });
                }
              }
              
            }
          }
        });
        
        console.log('All time slots before filtering:', allTimeSlots);
        
        // Sort time slots chronologically
        allTimeSlots.sort((a, b) => {
          const aMin = parse12HourTimeToMinutes(a.time) ?? 0;
          const bMin = parse12HourTimeToMinutes(b.time) ?? 0;
          return aMin - bMin;
        });
        
        // Filter out times that have already passed if viewing today
        const today = new Date();
        const isToday = selectedDate && 
          selectedDate.toDateString() === today.toDateString();
        
        if (isToday) {
          // Use manual formatting for current time to match time slot formatting
          const currentHours = today.getHours();
          const currentMinutes = today.getMinutes();
          const currentPeriod = currentHours >= 12 ? 'PM' : 'AM';
          const currentDisplayHours = currentHours === 0 ? 12 : currentHours > 12 ? currentHours - 12 : currentHours;
          const currentTime = `${currentDisplayHours}:${currentMinutes.toString().padStart(2, '0')} ${currentPeriod}`;
          
          console.log('Current time (manual format):', currentTime);
          console.log('Filtering out times before:', currentTime);
          
          allTimeSlots = allTimeSlots.filter(slot => {
            const slotMinutes = parse12HourTimeToMinutes(slot.time);
            const nowMinutes = currentHours * 60 + currentMinutes;
            const isTimePassed = (slotMinutes ?? Infinity) <= nowMinutes;
            
            if (isTimePassed) {
              console.log(`Filtering out ${slot.time} (already passed)`);
            }
            
            return !isTimePassed;
          });
        }
        
        // Filter out booked times
        if (tutor.data?.bookings) {
          const selectedDateString = selectedDate.toISOString().split('T')[0];
          const bookedTimesForDate = tutor.data.bookings
            .filter(booking => {
              const bookingDate = new Date(booking.date).toISOString().split('T')[0];
              return bookingDate === selectedDateString;
            })
            .map(booking => booking.time);
          
          console.log('Booked times for selected date:', bookedTimesForDate);
          
          // Mark booked times as unavailable
          allTimeSlots.forEach(slot => {
            // Booked times are stored in the tutor's timezone
            // Since students see converted times, we need to convert the displayed time back to tutor's timezone for comparison
            const originalTime = convertTimeBetweenTimezones(
              slot.time,
              studentTimezone,
              tutor.data?.timezone ?? 'PST'
            );
            if (bookedTimesForDate.includes(originalTime)) {
              slot.available = false;
            }
          });
        }
        
        console.log('Generated all time slots (after filtering):', allTimeSlots);
                  console.log('Debug info:', {
          userAgent: navigator.userAgent,
          studentTimezone: normalizedStudentTz,
          tutorTimezone: tutor.data?.timezone,
          selectedDate: selectedDate.toISOString(),
          selectedDay,
          dayAvailabilities,
          allTimeSlotsCount: allTimeSlots.length
        });
        
        // Add fallback for mobile devices if no time slots are available
        if (allTimeSlots.length === 0) {
          console.warn('No time slots generated, this might be a mobile timezone issue');
          console.log('Tutor availability:', tutor.data?.availability);
          console.log('Student timezone:', normalizedStudentTz);
          console.log('Tutor timezone:', tutor.data?.timezone);

          
          // Try to generate time slots without timezone conversion as fallback
          dayAvailabilities.forEach((dayAvailability) => {
            if (dayAvailability.timeRange) {
              const parts = String(dayAvailability.timeRange)
                .replace(/[–—]/g, '-')
                .split(/\s*-\s*/);
              const startTime = parts[0] ?? '';
              const endTime = parts[1] ?? '';
              const startMinutes = parse12HourTimeToMinutes(startTime);
              const endMinutes = parse12HourTimeToMinutes(endTime);
              if (startMinutes == null || endMinutes == null) {
                console.warn('Fallback: failed to parse time range:', { startTime, endTime });
                return;
              }
              for (let cur = startMinutes; cur < endMinutes; cur += 60) {
                const timeString = formatMinutesTo12Hour(cur);
                
                console.log('Fallback time slot (manual format):', timeString);
                
                allTimeSlots.push({
                  time: timeString,
                  available: true
                });
              }
            }
          });
          
          console.log('Fallback time slots (without conversion):', allTimeSlots);
          
          // If still no time slots, try using tutor's timezone directly
          if (allTimeSlots.length === 0 && tutor.data?.timezone) {
            console.log('Trying fallback with tutor timezone directly');
            dayAvailabilities.forEach((dayAvailability) => {
              if (dayAvailability.timeRange) {
                const parts = String(dayAvailability.timeRange)
                  .replace(/[–—]/g, '-')
                  .split(/\s*-\s*/);
              const startTime = parts[0];
              const endTime = parts[1];
              const startMinutes = parse12HourTimeToMinutes(startTime ?? '');
              const endMinutes = parse12HourTimeToMinutes(endTime ?? '');
              if (startMinutes == null || endMinutes == null) {
                console.warn('Second fallback: failed to parse time range:', { startTime, endTime });
                return;
              }
              for (let cur = startMinutes; cur < endMinutes; cur += 60) {
                const timeString = formatMinutesTo12Hour(cur);
                  
                  console.log('Second fallback time slot (manual format):', timeString);
                  
                  // Convert from tutor's timezone to a default timezone (PST) as last resort
                  const fallbackTime = convertTimeBetweenTimezones(
                    timeString,
                    (tutor.data?.timezone ?? 'PST').toUpperCase(),
                    'PST'
                  );
                  
                  allTimeSlots.push({
                    time: fallbackTime,
                    available: true
                  });
              }
              }
            });
            console.log('Fallback time slots (tutor timezone to PST):', allTimeSlots);
          }
        }
        
        setAvailableTimes(allTimeSlots);
      } else {
        console.log('No availability found for', selectedDay);
        setAvailableTimes([]);
      }
    }
  }, [selectedDate, tutor.data, studentTimezone]);

  // Set student timezone on component mount
  useEffect(() => {
    const detectedTimezone = getCurrentTimezone();
    console.log('Detected timezone:', detectedTimezone);
    console.log('Navigator timezone:', Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone);
    console.log('Timezone offset:', new Date().getTimezoneOffset());
    console.log('Current date string:', new Date().toString());
    
    setStudentTimezone(detectedTimezone);
    
    // Test timezone conversion
    console.log('Testing timezone conversion:');
    try {
      const testTime = '2:00 PM';
      const convertedTime = convertTimeBetweenTimezones(testTime, 'PST', 'EST');
      console.log(`Test conversion ${testTime} PST to EST:`, convertedTime);
    } catch (error) {
      console.error('Timezone conversion test failed:', error);
    }
    

  }, []);

  const handleBookNow = () => {
    if (!studentName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!studentEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    // Note: Stripe account no longer required for tutors - payments go to platform first
    // Tutors withdraw via wallet system

    // If first session is free and user checked the box, create booking directly
    if (tutor.data?.firstSessionFree && isFirstSession) {
      // Store booking time in tutor's timezone to prevent duplicates mismatching
      const timeInTutorTimezone = convertTimeBetweenTimezones(
        selectedTime,
        studentTimezone,
        tutor.data.timezone ?? 'PST'
      );

      createBooking.mutate({
        tutorId: tutor.data.clerkId,
        studentClerkId: user?.id,
        studentEmail: studentEmail.trim(),
        studentName: studentName.trim(),
        date: selectedDate.toISOString().split('T')[0] ?? '',
        time: timeInTutorTimezone,
        status: "confirmed",
        free : true,
      }, {
        onSuccess: (result: any) => {
          if (result?.conflicted) {
            toast.error('This time slot was just booked by someone else. Please choose another.');
            tutor.refetch();
            return;
          }
          toast.success('First session is free! Your booking is confirmed.');
          
          // Send confirmation emails
          if (tutor.data) {
            // Calculate end time (start time + 1 hour) for student timezone using robust parsing
            const studentStartMinutes = parse12HourTimeToMinutes(selectedTime);
            if (studentStartMinutes === null) {
              console.error('Failed to parse selected time for email:', selectedTime);
              return;
            }
            const studentEndMinutes = studentStartMinutes + 60; // Add 1 hour
            const studentEndTime = formatMinutesTo12Hour(studentEndMinutes);

            // Convert times to tutor's timezone
            const tutorStartTime = convertTimeBetweenTimezones(
              selectedTime,
              studentTimezone,
              tutor.data.timezone ?? 'PST'
            );
            
            // Calculate tutor end time using robust parsing
            const tutorStartMinutes = parse12HourTimeToMinutes(tutorStartTime);
            if (tutorStartMinutes === null) {
              console.error('Failed to parse tutor start time for email:', tutorStartTime);
              return;
            }
            const tutorEndMinutes = tutorStartMinutes + 60; // Add 1 hour
            const tutorEndTime = formatMinutesTo12Hour(tutorEndMinutes);

            const dateStr = selectedDate.toISOString().split('T')[0];

            console.log('Sending booking confirmation emails for free session via API...');

            fetch('/api/send-booking-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'both',
                bookingId: result.id,
                tutorTimezone: tutor.data.timezone ?? 'America/Los_Angeles',
                params: {
                  tutorName: `${tutor.data.firstName} ${tutor.data.lastName}`,
                  studentName,
                  date: dateStr,
                  startTime: selectedTime,
                  endTime: studentEndTime,
                  timeZone: studentTimezone,
                  studentEmail,
                  tutorEmail: tutor.data.email,
                  meetingLink: tutor.data.meetingLink ?? '',
                },
              }),
            })
              .then((res) => res.json())
              .then((result) => {
                if (result.success) {
                  console.log('Booking confirmation emails sent successfully');
                } else {
                  console.error('Failed to send some emails:', result);
                }
              })
              .catch((error) => {
                console.error('Error sending booking emails:', error);
              });
          }
          
          handlePaymentSuccess(result.id);
        },
        onError: (error) => {
          toast.error('Failed to create booking. Please try again.');
          console.error('Booking creation error:', error);
        }
      });
      return;
    }

    setShowPayment(true);
    
    // Scroll to payment section after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (paymentSectionRef.current) {
        paymentSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };

  const handlePaymentSuccess = (bookingId: string) => {
    setShowPayment(false);
    setSelectedDate(null);
    setSelectedTime('');
    setStudentName('');
    setStudentEmail('');
    // Invalidate the tutor query to refresh the bookings data
    tutor.refetch();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const onBooked = () => {
    // Empty function as requested - can be extended later
    console.log('Booking completed');
  };

  // Filter function for DatePicker to only allow available dates
  const filterDate = (date: Date) => {
    if (!tutor.data?.availability) {
      return false;
    }
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = tutor.data.availability.find(
      avail => avail.day === dayName && avail.available
    );
    
    return !!dayAvailability;
  };

  if (tutor.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Book a Session
      </h2>
      
      {/* Grid layout for horizontal form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Student Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
        </div>
        
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            filterDate={filterDate}
            placeholderText="Choose a date"
            minDate={new Date()}
            maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
            dateFormat="MMMM d, yyyy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            isClearable
            // Temporarily disable filtering for debugging
            // filterDate={undefined}
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Time
          </label>
          
          {/* Manual timezone selection - only show when no times available */}
          {availableTimes.length === 0 && selectedDate && (
            <div className="mb-2 p-2 bg-violet-50 border border-violet-200 rounded text-xs text-violet-800">
              <strong>No times available? Try adjusting your timezone:</strong><br/>
              <select
                value={studentTimezone}
                onChange={(e) => setStudentTimezone(e.target.value)}
                className="mt-1 w-full px-2 py-1 border border-violet-300 rounded text-xs"
              >
                <option value="PST">Pacific Standard Time (PST)</option>
                <option value="PDT">Pacific Daylight Time (PDT)</option>
                <option value="MST">Mountain Standard Time (MST)</option>
                <option value="MDT">Mountain Daylight Time (MDT)</option>
                <option value="CST">Central Standard Time (CST)</option>
                <option value="CDT">Central Daylight Time (CDT)</option>
                <option value="EST">Eastern Standard Time (EST)</option>
                <option value="EDT">Eastern Daylight Time (EDT)</option>
                <option value="AKST">Alaska Standard Time (AKST)</option>
                <option value="AKDT">Alaska Daylight Time (AKDT)</option>
                <option value="HST">Hawaii Standard Time (HST)</option>
                <option value="HDT">Hawaii Daylight Time (HDT)</option>
              </select>
              <div className="mt-1 text-xs text-gray-600">
                Select your timezone and times should appear
              </div>
            </div>
          )}
          
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            disabled={!selectedDate || availableTimes.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
          <option value="">
            {!selectedDate 
              ? 'Please select a date first' 
              : availableTimes.length === 0 
                ? 'No available times for this date' 
                : 'Choose a time'
            }
          </option>
          {availableTimes.map((slot) => (
            <option 
              key={slot.time} 
              value={slot.time}
              disabled={!slot.available}
            >
              {slot.time} {!slot.available ? '(Booked)' : ''}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* Bottom section with checkbox and button */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        {/* First Session Free Checkbox */}
        {tutor.data?.firstSessionFree && (
          <div className="flex items-center">
            <input
              id="first-session-checkbox"
              type="checkbox"
              checked={isFirstSession}
              onChange={e => setIsFirstSession(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="first-session-checkbox" className="text-sm text-gray-700 select-none">
              First session with this tutor?
            </label>
          </div>
        )}
        
        {/* Book Now Button */}
        <button
          onClick={handleBookNow}
          disabled={!selectedDate || !selectedTime}
          className="flex-1 sm:flex-initial sm:min-w-[200px] bg-violet-600 text-white py-3 px-6 rounded-md font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Book Now
        </button>
      </div>

      {/* Tutor Info */}
      {tutor.data && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-800 mb-2">
            {tutor.data.firstName} {tutor.data.lastName}
          </h3>
          <p className="text-sm text-gray-600">
            {tutor.data.school} • {tutor.data.major}
          </p>
          {tutor.data.hourlyRate > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              ${tutor.data.hourlyRate}/hour
            </p>
          )}
          
          {/* Secure Payment Note */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure payment via Stripe</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPayment && selectedDate && selectedTime && tutor.data && tutor.data.clerkId &&
        (!tutor.data.firstSessionFree || !isFirstSession) && (
          <div ref={paymentSectionRef} className="mt-6 border-t pt-6">
            <PaymentForm
              tutorId={tutor.data.clerkId}
              userId={userId}
              date={selectedDate.toISOString().split('T')[0] ?? ''}
              time={selectedTime}
              amount={tutor.data.hourlyRate * 100} // Convert to cents
              studentName={studentName}
              studentEmail={studentEmail}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        )}
    </div>
  );
};

export default ManualCal;
