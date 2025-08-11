import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import PaymentForm from './PaymentForm';
import { getCurrentTimezone, convertTimeBetweenTimezones } from '~/utils/timezones';
import emailjs from '@emailjs/browser';

interface ManualCalProps {
  userId: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const ManualCal: React.FC<ManualCalProps> = ({ userId }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentTimezone, setStudentTimezone] = useState('PST');
  const [isFirstSession, setIsFirstSession] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTimezoneOverride, setShowTimezoneOverride] = useState(false);
  
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
        
        // Process all availability entries for this day
        dayAvailabilities.forEach((dayAvailability, index) => {
          if (dayAvailability.timeRange) {
            // Parse time range (assuming format like "9:00 AM - 5:00 PM")
            const [startTime, endTime] = dayAvailability.timeRange.split(' - ');
            
            console.log(`Time range ${index + 1}:`, startTime, 'to', endTime);
            
            // Generate time slots every hour for this time range
            const start = new Date(`2000-01-01 ${startTime}`);
            const end = new Date(`2000-01-01 ${endTime}`);
            
            while (start < end) {
              const timeString = start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
              
              console.log('Original time string:', timeString);
              
              // Always convert time from tutor's timezone to student's timezone
              const displayTime = convertTimeBetweenTimezones(
                timeString,
                tutor.data?.timezone ?? 'PST',
                studentTimezone
              );
              
              console.log('Converted time:', displayTime);
              
              // Only add if not already in the list (avoid duplicates)
              if (!allTimeSlots.some(slot => slot.time === displayTime)) {
                allTimeSlots.push({
                  time: displayTime,
                  available: true
                });
              }
              
              start.setHours(start.getHours() + 1);
            }
          }
        });
        
        console.log('All time slots before filtering:', allTimeSlots);
        
        // Sort time slots chronologically
        allTimeSlots.sort((a, b) => {
          const timeA = new Date(`2000-01-01 ${a.time}`);
          const timeB = new Date(`2000-01-01 ${b.time}`);
          return timeA.getTime() - timeB.getTime();
        });
        
        // Filter out times that have already passed if viewing today
        const today = new Date();
        const isToday = selectedDate && 
          selectedDate.toDateString() === today.toDateString();
        
        if (isToday) {
          const currentTime = today.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          console.log('Current time:', currentTime);
          console.log('Filtering out times before:', currentTime);
          
          allTimeSlots = allTimeSlots.filter(slot => {
            const slotTime = new Date(`2000-01-01 ${slot.time}`);
            const currentTimeDate = new Date(`2000-01-01 ${currentTime}`);
            const isTimePassed = slotTime <= currentTimeDate;
            
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
        
        // Add fallback for mobile devices if no time slots are available
        if (allTimeSlots.length === 0) {
          console.warn('No time slots generated, this might be a mobile timezone issue');
          console.log('Tutor availability:', tutor.data?.availability);
          console.log('Student timezone:', studentTimezone);
          console.log('Tutor timezone:', tutor.data?.timezone);
          
          // Try to generate time slots without timezone conversion as fallback
          dayAvailabilities.forEach((dayAvailability) => {
            if (dayAvailability.timeRange) {
              const [startTime, endTime] = dayAvailability.timeRange.split(' - ');
              const start = new Date(`2000-01-01 ${startTime}`);
              const end = new Date(`2000-01-01 ${endTime}`);
              
              while (start < end) {
                const timeString = start.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });
                
                allTimeSlots.push({
                  time: timeString,
                  available: true
                });
                
                start.setHours(start.getHours() + 1);
              }
            }
          });
          
          console.log('Fallback time slots (without conversion):', allTimeSlots);
          
          // If still no time slots, try using tutor's timezone directly
          if (allTimeSlots.length === 0 && tutor.data?.timezone) {
            console.log('Trying fallback with tutor timezone directly');
            dayAvailabilities.forEach((dayAvailability) => {
              if (dayAvailability.timeRange) {
                const [startTime, endTime] = dayAvailability.timeRange.split(' - ');
                const start = new Date(`2000-01-01 ${startTime}`);
                const end = new Date(`2000-01-01 ${endTime}`);
                
                while (start < end) {
                  const timeString = start.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  
                  // Convert from tutor's timezone to a default timezone (PST) as last resort
                  const fallbackTime = convertTimeBetweenTimezones(
                    timeString,
                    tutor.data?.timezone ?? 'PST',
                    'PST'
                  );
                  
                  allTimeSlots.push({
                    time: fallbackTime,
                    available: true
                  });
                  
                  start.setHours(start.getHours() + 1);
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
    
    // Detect if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isMobileViewport = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || isMobileViewport);
      console.log('Mobile detection:', { isMobileDevice, isMobileViewport, isMobile: isMobileDevice || isMobileViewport });
      console.log('User agent:', userAgent);
      console.log('Viewport width:', window.innerWidth);
    };
    
    checkMobile();
    
    // Add resize listener for viewport changes
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
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

    // Check if tutor has set up their payment account
    if (!tutor.data?.stripeAccountId) {
      toast.error('This tutor has not set up their payment account yet. Please try again later.');
      return;
    }

    // Show warning for pending accounts but allow booking
    if (tutor.data?.stripeAccountStatus === 'pending') {
      toast('This tutor is still verifying their payment account. Your booking will be processed once verification is complete.', {
        duration: 4000,
        icon: '⚠️',
      });
    }

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
            // Calculate end time (start time + 1 hour) for student timezone
            const studentStartTimeDate = new Date(`2000-01-01 ${selectedTime}`);
            const studentEndTimeDate = new Date(studentStartTimeDate.getTime() + 60 * 60 * 1000); // Add 1 hour
            const studentEndTime = studentEndTimeDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });

            // Convert times to tutor's timezone
            const tutorStartTime = convertTimeBetweenTimezones(
              selectedTime,
              studentTimezone,
              tutor.data.timezone ?? 'PST'
            );
            const tutorStartTimeDate = new Date(`2000-01-01 ${tutorStartTime}`);
            const tutorEndTimeDate = new Date(tutorStartTimeDate.getTime() + 60 * 60 * 1000); // Add 1 hour
            const tutorEndTime = tutorEndTimeDate.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });

            const dateStr = selectedDate.toISOString().split('T')[0];

            // Email params for tutor (in tutor's timezone)
            const tutorEmailParams = {
              tutor_name: `${tutor.data.firstName} ${tutor.data.lastName}`,
              student_name: studentName,
              date: dateStr,
              start_time: tutorStartTime,
              end_time: tutorEndTime,
              timeZone: tutor.data.timezone ?? 'PST',
              student_email: studentEmail,
              tutor_email: tutor.data.email,
              location: tutor.data.meetingLink ?? 'N/A',
            };

            // Email params for student (in student's timezone)
            const studentEmailParams = {
              tutor_name: `${tutor.data.firstName} ${tutor.data.lastName}`,
              student_name: studentName,
              date: dateStr,
              start_time: selectedTime,
              end_time: studentEndTime,
              timeZone: studentTimezone,
              student_email: studentEmail,
              tutor_email: tutor.data.email,
              location: tutor.data.meetingLink ?? 'N/A',
            };

            console.log('Sending emails for free session with params:');
            console.log('Tutor email params:', tutorEmailParams);
            console.log('Student email params:', studentEmailParams);

            // Send email to tutor
            emailjs.send("service_z8zzszl", "template_z7etjno", tutorEmailParams, {
              publicKey: "To4xMN8D9pz4wwmq8",
            }).then(() => {
              console.log('Email sent to tutor successfully');
            }).catch((error) => {
              console.error('Error sending email to tutor:', error);
            });

            // Send email to student
            emailjs.send("service_z8zzszl", "template_gvkyabt", studentEmailParams, {
              publicKey: "To4xMN8D9pz4wwmq8",
            }).then(() => {
              console.log('Email sent to student successfully');
            }).catch((error) => {
              console.error('Error sending email to student:', error);
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
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Book a Session
      </h2>
      
      {/* Student Information */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          placeholder="Enter your email address"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      
      {/* Date Selection */}
      <div className="mb-6">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          isClearable
          // Temporarily disable filtering for debugging
          // filterDate={undefined}
        />
      </div>

      {/* Time Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Time
        </label>
        
        {/* Debug info for mobile */}
        {isMobile && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Mobile Debug Info:</strong><br/>
            Student Timezone: {studentTimezone}<br/>
            Tutor Timezone: {tutor.data?.timezone || 'Unknown'}<br/>
            Available Times Count: {availableTimes.length}<br/>
            Selected Date: {selectedDate?.toDateString() || 'None'}
            
            {/* Timezone override button */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowTimezoneOverride(!showTimezoneOverride)}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                {showTimezoneOverride ? 'Hide' : 'Override'} Timezone
              </button>
            </div>
          </div>
        )}
        
        {/* Timezone override section */}
        {isMobile && showTimezoneOverride && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>Manual Timezone Selection:</strong><br/>
            <select
              value={studentTimezone}
              onChange={(e) => setStudentTimezone(e.target.value)}
              className="mt-1 w-full px-2 py-1 border border-blue-300 rounded text-xs"
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
              If times still don't appear, try different timezone options
            </div>
            <button
              type="button"
              onClick={() => {
                // Force a refresh of the time slots
                if (selectedDate) {
                  setSelectedDate(null);
                  setTimeout(() => setSelectedDate(selectedDate), 100);
                }
              }}
              className="mt-2 w-full text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
            >
              Refresh Time Slots
            </button>
          </div>
        )}
        
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          disabled={!selectedDate || availableTimes.length === 0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
        
        {/* Additional debug info */}
        {isMobile && availableTimes.length === 0 && selectedDate && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <strong>No time slots available. Possible issues:</strong><br/>
            • Timezone conversion problem<br/>
            • Mobile browser compatibility issue<br/>
            • Check console for detailed logs
          </div>
        )}
      </div>

      {/* Book Now Button */}
      {/* First Session Free Checkbox */}
      {tutor.data?.firstSessionFree && <div className="mb-4 flex items-center">
        <input
          id="first-session-checkbox"
          type="checkbox"
          checked={isFirstSession}
          onChange={e => setIsFirstSession(e.target.checked)}
          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="first-session-checkbox" className="text-sm text-gray-700 select-none">
          First session with this tutor?
        </label>
      </div>}
      <button
        onClick={handleBookNow}
        disabled={!selectedDate || !selectedTime}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Book Now
      </button>

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
          
          {/* Payment Account Status */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Payment Status: {' '}
              {!tutor.data.stripeAccountId ? (
                <span className="text-red-600 font-medium">Not set up</span>
              ) : tutor.data.stripeAccountStatus === 'active' ? (
                <span className="text-green-600 font-medium">Ready</span>
              ) : (
                <span className="text-yellow-600 font-medium">Pending verification</span>
              )}
            </p>
            {tutor.data.stripeAccountStatus === 'pending' && (
              <p className="text-xs text-gray-500 mt-1">
                This tutor is still setting up their payment account. You can book now, but payment will be processed once their account is verified.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPayment && selectedDate && selectedTime && tutor.data && tutor.data.clerkId &&
        (!tutor.data.firstSessionFree || !isFirstSession) && (
          <div className="mt-6 border-t pt-6">
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
