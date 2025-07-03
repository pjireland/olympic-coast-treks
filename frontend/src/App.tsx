import { useState } from 'react'
import './App.css'

import Dropdown from './components/Dropdown';
import DateRangePicker from './components/DateRangePicker';

function App() {
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDropdownSelect = (direction: string, section: string) => {
    setSelectedDirection(direction);
    setSelectedSection(section);
    // You can store these in useState or trigger additional effects
  };

  const isValidInput = startDate && endDate && selectedDirection && selectedSection;

  const callAPI = async () => {
    const apiData = {
      section: selectedSection,
      direction: selectedDirection,
      start_date: startDate,
      end_date: endDate,
    };

    console.log('Calling API with:', apiData);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="w-fit mx-auto bg-white p-6 rounded-lg shadow-md text-left">
        <Dropdown
          onSelect={handleDropdownSelect}
        />
        <DateRangePicker startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate} />
        <button
          onClick={callAPI}
          disabled={!isValidInput}
          className={`px-4 py-2 rounded-md font-semibold ${isValidInput
            ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>Find routes</button>
      </div>
    </main>
  );
}

export default App;
