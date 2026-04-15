interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
}

const DatePicker = ({ date, setDate }: DatePickerProps) => {
  // Get today's date in YYYY-MM-DD format for the 'min' constraint
  const today = new Date().toISOString().split('T')[0];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  return (
    <div className='mb-4'>
      <div className='flex gap-4 items-end'>
        <div className='flex-1'>
          <label className='block text-m font-semibold text-gray-700 mb-2'>
            Select date:
          </label>
          <input
            type='date'
            value={date}
            onChange={handleDateChange}
            min={today}
            className='w-full h-10 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800'
          />
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
