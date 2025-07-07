import { useState } from 'react'
import './App.css'

import Dropdown from './components/Dropdown';
import DateRangePicker from './components/DateRangePicker';
import HikingSpeedSlider from './components/HikingSpeedSlider';
import DistanceRangeSlider from './components/DistanceRangeSlider';
import TidalBufferSlider from './components/TidalBufferSlider';


function App() {
  const getQueryParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      section: params.get('section') || '',
      direction: params.get('direction') || '',
      start_date: params.get('start_date') || '',
      end_date: params.get('end_date') || '',
      speed: parseFloat(params.get('speed') || '1.0'),
      min_daily_distance: parseFloat(params.get('min_daily_distance') || '3.0'),
      max_daily_distance: parseFloat(params.get('max_daily_distance') || '8.0'),
      min_buffer: parseFloat(params.get('min_buffer') || '1.0'),
    };
  };

  const initialParams = getQueryParams();
  const [selectedDirection, setSelectedDirection] = useState(initialParams.direction);
  const [selectedSection, setSelectedSection] = useState(initialParams.section);
  const [startDate, setStartDate] = useState(initialParams.start_date);
  const [endDate, setEndDate] = useState(initialParams.end_date);
  const [speed, setSpeed] = useState(initialParams.speed);
  const [minDistance, setMinDistance] = useState(initialParams.min_daily_distance);
  const [maxDistance, setMaxDistance] = useState(initialParams.max_daily_distance);
  const [buffer, setBuffer] = useState(initialParams.min_buffer);

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
      speed: speed,
      min_daily_distance: minDistance,
      max_daily_distance: maxDistance,
      min_buffer: buffer,
    };

    console.log('Calling API with:', apiData); // TODO

    const params = new URLSearchParams();
    params.set('section', selectedSection);
    params.set('direction', selectedDirection);
    params.set('start_date', startDate);
    params.set('end_date', endDate);
    params.set('speed', speed.toString());
    params.set('min_daily_distance', minDistance.toString());
    params.set('max_daily_distance', maxDistance.toString());
    params.set('min_buffer', buffer.toString());

    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="w-fit mx-auto bg-white p-6 rounded-lg shadow-md text-left">
        <Dropdown
          initialDirection={selectedDirection}
          initialSection={selectedSection}
          onSelect={handleDropdownSelect}
        />
        <DateRangePicker startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate} />
        <HikingSpeedSlider speed={speed} setSpeed={setSpeed} />
        <DistanceRangeSlider
          minDistance={minDistance}
          setMinDistance={setMinDistance}
          maxDistance={maxDistance}
          setMaxDistance={setMaxDistance}
        />
        <TidalBufferSlider buffer={buffer} setBuffer={setBuffer} />
        <div className="w-fit rounded-lg text-left">
          <button
            onClick={callAPI}
            disabled={!isValidInput}
            className={`px-4 py-2 rounded-md font-semibold ${isValidInput
              ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}>Find routes</button>
        </div>
      </div>
    </main>
  );
}

export default App;
