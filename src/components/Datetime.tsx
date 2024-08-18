import { useState } from 'react';

const AvailabilityForm = () => {
    const daysOfWeek = [
        { day: 'Sunday', time: '9:00am - 5:00pm' },
        { day: 'Monday', time: '9:00am - 5:00pm' },
        { day: 'Tuesday', time: '9:00am - 5:00pm' },
        { day: 'Wednesday', time: '9:00am - 5:00pm' },
        { day: 'Thursday', time: '9:00am - 5:00pm' },
        { day: 'Friday', time: '9:00am - 5:00pm' }
    ];

    const [availability, setAvailability] = useState(
        daysOfWeek.map(day => ({ day: day.day, available: 'NO', time: day.time }))
    );

    const handleAvailabilityChange = (index, value) => {
        const newAvailability = [...availability];
        newAvailability[index].available = value;
        setAvailability(newAvailability);
    };

    return (
        <div className="space-y-4 py-6">
            {availability.map((day, index) => (
                <div key={day.day} className="grid grid-cols-3 gap-4 items-center">
                    <label className="font-semibold">{day.day}</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={day.available}
                        onChange={(e) => handleAvailabilityChange(index, e.target.value)}
                    >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                    </select>
                    {day.available === 'YES' && (
                        <input
                            type="text"
                            placeholder={day.time}
                            
                            className="border rounded px-2 py-1 bg-gray-100"
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

export default AvailabilityForm;
