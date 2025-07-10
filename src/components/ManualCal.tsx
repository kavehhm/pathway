import React, { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

  // Fetch tutor availability using tRPC
//   const { data: tutorData, isLoading, error } = api.post.getTutor.useQuery(userId, {
//     enabled: !!userId, // Only run query if userId is provided
//   });
  const tutor = api.post.getSingleTutor.useQuery(userId as string);

  // Debug logging for tutor data
  useEffect(() => {
    if (tutor.data) {
      console.log('Full tutor data:', tutor.data);
      console.log('Tutor ID:', userId);
      console.log('Tutor username:', tutor.data.username);
      console.log('Availability array:', tutor.data.availability);
      
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
  }, [tutor, userId]);

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
      const dayAvailability = tutor.data.availability.find(
        (avail) => avail.day === selectedDay && avail.available
      );

      if (dayAvailability) {
        console.log('Day availability for', selectedDay, ':', dayAvailability);
        
        if (dayAvailability.timeRange) {
          // Parse time range (assuming format like "9:00 AM - 5:00 PM")
          const timeSlots: TimeSlot[] = [];
          const [startTime, endTime] = dayAvailability.timeRange.split(' - ');
          
          console.log('Time range:', startTime, 'to', endTime);
          
          // Generate time slots every hour
          const start = new Date(`2000-01-01 ${startTime}`);
          const end = new Date(`2000-01-01 ${endTime}`);
          
          while (start < end) {
            timeSlots.push({
              time: start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              }),
              available: true
            });
            start.setHours(start.getHours() + 1);
          }
          
          console.log('Generated time slots:', timeSlots);
          setAvailableTimes(timeSlots);
        } else {
          // If no timeRange, show default time slots
          const defaultTimeSlots: TimeSlot[] = [
            { time: '9:00 AM', available: true },
            { time: '10:00 AM', available: true },
            { time: '11:00 AM', available: true },
            { time: '12:00 PM', available: true },
            { time: '1:00 PM', available: true },
            { time: '2:00 PM', available: true },
            { time: '3:00 PM', available: true },
            { time: '4:00 PM', available: true },
            { time: '5:00 PM', available: true },
          ];
          
          console.log('Using default time slots:', defaultTimeSlots);
          setAvailableTimes(defaultTimeSlots);
        }
      } else {
        console.log('No availability found for', selectedDay);
        setAvailableTimes([]);
      }
    }
  }, [selectedDate, tutor.data]);

  // Booking mutation
  const bookSession = api.post.bookSession.useMutation({
    onSuccess: () => {
      toast.success('Session booked successfully!');
      setSelectedDate(null);
      setSelectedTime('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to book session');
    }
  });

  const handleBookNow = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    bookSession.mutate({
      tutorId: userId,
      date: selectedDate.toISOString().split('T')[0] || '',
      time: selectedTime
    });
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
              {slot.time}
            </option>
          ))}
        </select>
      </div>

      {/* Book Now Button */}
      <button
        onClick={handleBookNow}
        disabled={!selectedDate || !selectedTime || bookSession.isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {bookSession.isLoading ? 'Booking...' : 'Book Now'}
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
        </div>
      )}
    </div>
  );
};

export default ManualCal;
