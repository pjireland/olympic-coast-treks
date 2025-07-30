import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import './App.css';
import type { PlotData, Layout } from 'plotly.js-basic-dist';

import Dropdown from './components/Dropdown';
import DateRangePicker from './components/DateRangePicker';
import HikingSpeedSlider from './components/HikingSpeedSlider';
import DistanceRangeSlider from './components/DistanceRangeSlider';
import TidalBufferSlider from './components/TidalBufferSlider';

// Define the shape of your API response
interface Route {
  campsite_combination: number;
  date: string; // ISO date string
  start_location: string;
  end_location: string;
  distance: number;
  first_possible_start: string; // ISO datetime string
  last_possible_start: string; // ISO datetime string
  first_possible_end: string; // ISO datetime string
  last_possible_end: string; // ISO datetime string
}

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
  const [selectedDirection, setSelectedDirection] = useState(
    initialParams.direction,
  );
  const [selectedSection, setSelectedSection] = useState(initialParams.section);
  const [startDate, setStartDate] = useState(initialParams.start_date);
  const [endDate, setEndDate] = useState(initialParams.end_date);
  const [speed, setSpeed] = useState(initialParams.speed);
  const [minDistance, setMinDistance] = useState(
    initialParams.min_daily_distance,
  );
  const [maxDistance, setMaxDistance] = useState(
    initialParams.max_daily_distance,
  );
  const [buffer, setBuffer] = useState(initialParams.min_buffer);

  // New state for API results and loading
  const [results, setResults] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(
    new Set(),
  );
  // New state for expanded table rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // State for slider values for each row (in minutes from midnight)
  const [rowSliderValues, setRowSliderValues] = useState<
    Record<string, number>
  >({});
  // State for hiking speed values for each row
  const [rowSpeedValues, setRowSpeedValues] = useState<Record<string, number>>(
    {},
  );
  // State for plot API response
  type PlotEntry = {
    rowKey: string;
    data: PlotData[];
    layout: Partial<Layout> & { meta?: { ozette_river_warning?: boolean } };
  };
  const [plotResponses, setPlotResponses] = useState<PlotEntry[]>([]);

  type MergedRoute = {
    campsite_combination: number;
    date: string;
    start_location: string;
    end_location: string;
    distance: number;
    start_times: { first: string; last: string }[];
    end_times: { first: string; last: string }[];
  };

  const handleDropdownSelect = (direction: string, section: string) => {
    setSelectedDirection(direction);
    setSelectedSection(section);
  };

  const isValidInput =
    startDate && endDate && selectedDirection && selectedSection;

  const callAPI = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setExpandedOptions(new Set());
    setExpandedRows(new Set()); // Reset expanded rows on new search
    setRowSliderValues({}); // Reset slider values on new search
    setRowSpeedValues({}); // Reset speed values on new search
    setPlotResponses([]); // Reset plot response on new search

    try {
      // Build query parameters for GET request
      const params = new URLSearchParams();
      params.set('section', selectedSection);
      params.set('direction', selectedDirection);
      params.set('start_date', startDate);
      params.set('end_date', endDate);
      params.set('speed', speed.toString());
      params.set('min_daily_distance', minDistance.toString());
      params.set('max_daily_distance', maxDistance.toString());
      params.set('min_buffer', buffer.toString());

      const response = await fetch(
        `http://localhost:8000/routes?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: Route[] = await response.json();
      setResults(data || []);

      // Update URL parameters (keeping this for browser history)
      const urlParams = new URLSearchParams();
      urlParams.set('section', selectedSection);
      urlParams.set('direction', selectedDirection);
      urlParams.set('start_date', startDate);
      urlParams.set('end_date', endDate);
      urlParams.set('speed', speed.toString());
      urlParams.set('min_daily_distance', minDistance.toString());
      urlParams.set('max_daily_distance', maxDistance.toString());
      urlParams.set('min_buffer', buffer.toString());

      window.history.pushState(
        {},
        '',
        `${window.location.pathname}?${urlParams.toString()}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching routes',
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    ).toLocaleDateString();
  };

  const formatTimeOnly = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleOption = (campsiteCombination: number) => {
    setExpandedOptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campsiteCombination)) {
        newSet.delete(campsiteCombination);
      } else {
        newSet.add(campsiteCombination);
      }
      return newSet;
    });
  };

  // New function to toggle row expansion
  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  // Helper function to convert time string to minutes from midnight
  const timeToMinutes = (timeString: string): number => {
    const date = new Date(timeString);
    return date.getHours() * 60 + date.getMinutes();
  };

  // Helper function to convert minutes from midnight to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  // Helper function to round time to nearest 6-minute interval
  const roundToNearestSixMinutes = (minutes: number): number => {
    return Math.round(minutes / 6) * 6;
  };

  // Helper function to get default slider value for a row
  const getDefaultSliderValue = (
    startTimes: { first: string; last: string }[],
  ): number => {
    if (startTimes.length === 0) return 720; // Default to 12:00 PM if no times

    // Use the first time window for default calculation
    const firstWindow = startTimes[0];
    const startMinutes = timeToMinutes(firstWindow.first);
    const endMinutes = timeToMinutes(firstWindow.last);
    const middleMinutes = (startMinutes + endMinutes) / 2;

    return roundToNearestSixMinutes(middleMinutes);
  };

  // Function to update slider value for a specific row
  const updateSliderValue = (rowKey: string, value: number) => {
    setRowSliderValues((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
  };

  // Function to update speed value for a specific row
  const updateSpeedValue = (rowKey: string, value: number) => {
    setRowSpeedValues((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
  };

  // Function to handle plot route button click
  const handlePlotRoute = async (rowKey: string, route: MergedRoute) => {
    const departureTime =
      rowSliderValues[rowKey] || getDefaultSliderValue(route.start_times);
    const hikingSpeed = rowSpeedValues[rowKey] || speed;

    // Convert departureTime (minutes from midnight) to a full datetime string
    const routeDate = new Date(route.date);
    const hours = Math.floor(departureTime / 60);
    const minutes = departureTime % 60;
    routeDate.setHours(hours, minutes, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startTime =
      routeDate.getFullYear() +
      '-' +
      pad(routeDate.getMonth() + 1) +
      '-' +
      pad(routeDate.getDate() + 1) +
      'T' +
      pad(routeDate.getHours()) +
      ':' +
      pad(routeDate.getMinutes());
    try {
      // Build query parameters for GET request
      const params = new URLSearchParams();
      params.set('start_time', startTime);
      params.set('start_location', route.start_location);
      params.set('end_location', route.end_location);
      params.set('speed', hikingSpeed.toString());

      const response = await fetch(
        `http://localhost:8000/plot?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const responseData = await response.json();

      // Store the response in state so we can display it
      setPlotResponses((prev) => {
        const filteredResponses = prev.filter(
          (entry) => entry.rowKey !== rowKey,
        );
        return [
          ...filteredResponses,
          { rowKey, data: responseData.data, layout: responseData.layout },
        ];
      });
    } catch (error) {
      console.error('Error calling plot API:', error);
      setPlotResponses((prev) => [
        ...prev.filter((entry) => entry.rowKey !== rowKey),
        {
          rowKey,
          data: [],
          layout: {
            title: {
              text: 'Error loading plot',
            },
            annotations: [
              {
                text:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
                showarrow: false,
                font: { size: 16, color: 'red' },
              },
            ],
          },
        },
      ]);
    }
  };

  // Helper function to get unique locations for a set of routes
  const getUniqueLocations = (routes: Route[]) => {
    const locationSet = new Set<string>();
    routes.forEach((route) => {
      locationSet.add(route.start_location);
      locationSet.add(route.end_location);
    });
    const locations = Array.from(locationSet);
    // Drop first and last entries
    return locations.slice(1, -1);
  };

  // Add this state and effect in your component
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add this helper function in your component (before the return statement)
  const getPlotDimensions = () => {
    if (typeof windowSize !== 'undefined') {
      // Get the available width (accounting for padding, margins, etc.)
      const maxWidth = Math.min(windowSize.width, 800); // 85% of screen width, max 800px
      const height = Math.floor(maxWidth * 0.6); // 60% aspect ratio (adjust as needed)

      return {
        width: maxWidth,
        height: height,
      };
    }

    return { width: 600, height: 360 }; // Fallback dimensions
  };

  return (
    <main className='min-h-screen bg-gray-100 p-8'>
      <h1 className='text-4xl font-bold text-gray-800 text-center mb-8'>
        Olympic Coast Trek Planner
      </h1>
      <div className='w-fit mx-auto space-y-0'>
        <div className='bg-white p-6 rounded-t-lg shadow-md text-left'>
          <div className='flex gap-6 items-start'>
            <Dropdown
              initialDirection={selectedDirection}
              initialSection={selectedSection}
              onSelect={handleDropdownSelect}
            />
            <DateRangePicker
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
            />
          </div>
          <HikingSpeedSlider speed={speed} setSpeed={setSpeed} />
          <DistanceRangeSlider
            minDistance={minDistance}
            setMinDistance={setMinDistance}
            maxDistance={maxDistance}
            setMaxDistance={setMaxDistance}
          />
          <TidalBufferSlider buffer={buffer} setBuffer={setBuffer} />
          <div className='w-fit rounded-lg text-left'>
            <button
              onClick={callAPI}
              disabled={!isValidInput || isLoading}
              className={`px-4 py-2 rounded-md font-semibold ${
                isValidInput && !isLoading
                  ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Searching...' : 'Find routes'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className='bg-white p-6 pt-4 rounded-b-lg shadow-md text-left'>
            <h2 className='text-2xl font-bold text-gray-800 mb-4'>
              Possible routes
            </h2>

            {error && (
              <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
                <strong>Error:</strong> {error}
              </div>
            )}

            {isLoading && (
              <div className='text-center py-8'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                <p className='mt-2 text-gray-600'>Searching for routes...</p>
              </div>
            )}

            {!isLoading && !error && results.length === 0 && (
              <div className='text-center py-8 text-gray-500'>
                <p>No routes found for your search criteria.</p>
                <p className='text-sm mt-2'>
                  Try adjusting your parameters and search again.
                </p>
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className='space-y-8'>
                {/* Group routes by campsite_combination */}
                {Object.entries(
                  results.reduce(
                    (groups, route) => {
                      const key = route.campsite_combination;
                      if (!groups[key]) {
                        groups[key] = [];
                      }
                      groups[key].push(route);
                      return groups;
                    },
                    {} as Record<number, Route[]>,
                  ),
                )
                  .sort(([a], [b]) => Number(a) - Number(b)) // Sort by campsite combination number
                  .map(([campsiteCombination, routes], index) => {
                    // Get unique locations for this campsite combination
                    const uniqueLocations = getUniqueLocations(routes);

                    // Merge duplicate rows with same campsite_combination, date, start_location, end_location
                    const mergedRoutes = routes.reduce(
                      (acc, route) => {
                        const key = `${route.campsite_combination}-${route.date}-${route.start_location}-${route.end_location}`;
                        if (!acc[key]) {
                          acc[key] = {
                            campsite_combination: route.campsite_combination,
                            date: route.date,
                            start_location: route.start_location,
                            end_location: route.end_location,
                            distance: route.distance,
                            start_times: [],
                            end_times: [],
                          };
                        }
                        acc[key].start_times.push({
                          first: route.first_possible_start,
                          last: route.last_possible_start,
                        });
                        acc[key].end_times.push({
                          first: route.first_possible_end,
                          last: route.last_possible_end,
                        });
                        return acc;
                      },
                      {} as Record<string, MergedRoute>,
                    );

                    return (
                      <div
                        key={campsiteCombination}
                        className='bg-gray-50 p-4 rounded-lg'
                      >
                        <div className='flex items-center gap-1 mb-2'>
                          <button
                            onClick={() =>
                              toggleOption(Number(campsiteCombination))
                            }
                            className='flex-shrink-0 w-5 h-5 p-0 text-lg font-bold text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center'
                          >
                            {expandedOptions.has(Number(campsiteCombination))
                              ? '−'
                              : '+'}
                          </button>
                          <h3 className='text-xl font-semibold text-gray-800'>
                            Option {index + 1}
                          </h3>
                        </div>
                        <div className='mb-4'>
                          <div className='flex items-center gap-2'>
                            <p className='text-sm text-gray-600'>Campsites:</p>
                            <div className='flex flex-wrap gap-2'>
                              {uniqueLocations.map((location, locIndex) => (
                                <span
                                  key={locIndex}
                                  className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full'
                                >
                                  {location}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className='flex items-center gap-2 mt-2'>
                            <p className='text-sm text-gray-600'>
                              Daily distances:
                            </p>
                            <div className='flex flex-wrap gap-2'>
                              {Object.values(mergedRoutes).map(
                                (route, routeIndex) => (
                                  <span
                                    key={routeIndex}
                                    className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full'
                                  >
                                    {route.distance.toFixed(1)} mi
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedOptions.has(Number(campsiteCombination)) && (
                          <div className='overflow-x-auto'>
                            <table className='w-full bg-white text-sm'>
                              <thead>
                                <tr className='text-left underline'>
                                  <th className='px-4 py-2 w-8'></th>
                                  <th className='px-4 py-2'>Date</th>
                                  <th className='px-4 py-2'>Start Location</th>
                                  <th className='px-4 py-2'>End Location</th>
                                  <th className='px-4 py-2'>Distance</th>
                                  <th className='px-4 py-2'>Start Window</th>
                                  <th className='px-4 py-2'>End Window</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.values(mergedRoutes).map(
                                  (route, routeIndex) => {
                                    const rowKey = `${route.campsite_combination}-${route.date}-${routeIndex}`;
                                    const isRowExpanded =
                                      expandedRows.has(rowKey);

                                    return (
                                      <React.Fragment key={rowKey}>
                                        <tr className='hover:bg-gray-50'>
                                          <td className='px-4 py-2'>
                                            <button
                                              onClick={() => toggleRow(rowKey)}
                                              className='flex-shrink-0 w-5 h-5 p-0 text-lg font-bold text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center'
                                            >
                                              {isRowExpanded ? '−' : '+'}
                                            </button>
                                          </td>
                                          <td className='px-4 py-2'>
                                            {formatDate(route.date)}
                                          </td>
                                          <td className='px-4 py-2'>
                                            {route.start_location}
                                          </td>
                                          <td className='px-4 py-2'>
                                            {route.end_location}
                                          </td>
                                          <td className='px-4 py-2'>
                                            {route.distance.toFixed(1)} mi
                                          </td>
                                          <td className='px-4 py-2'>
                                            <div className='space-y-1'>
                                              {route.start_times.map(
                                                (timeWindow, timeIndex) => (
                                                  <div
                                                    key={timeIndex}
                                                    className='pb-1'
                                                  >
                                                    <div>
                                                      {formatTimeOnly(
                                                        timeWindow.first,
                                                      )}{' '}
                                                      –{' '}
                                                      {formatTimeOnly(
                                                        timeWindow.last,
                                                      )}
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </td>
                                          <td className='px-4 py-2'>
                                            <div className='space-y-1'>
                                              {route.end_times.map(
                                                (timeWindow, timeIndex) => (
                                                  <div
                                                    key={timeIndex}
                                                    className='pb-1'
                                                  >
                                                    <div>
                                                      {formatTimeOnly(
                                                        timeWindow.first,
                                                      )}{' '}
                                                      –{' '}
                                                      {formatTimeOnly(
                                                        timeWindow.last,
                                                      )}
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                        {isRowExpanded && (
                                          <tr className='bg-blue-50'>
                                            <td
                                              className='px-4 py-3'
                                              colSpan={7}
                                            >
                                              <div className='text-sm text-gray-700 space-y-3 pl-14 pr-6'>
                                                <div className='flex gap-6 items-start'>
                                                  <div className='flex-1'>
                                                    <label className='block font-medium mb-2'>
                                                      Departure Time:{' '}
                                                      {minutesToTime(
                                                        rowSliderValues[
                                                          rowKey
                                                        ] ||
                                                          getDefaultSliderValue(
                                                            route.start_times,
                                                          ),
                                                      )}
                                                    </label>
                                                    <input
                                                      type='range'
                                                      min='0'
                                                      max='1434' // 11:54 PM = 23*60 + 54 = 1434 minutes
                                                      step='6'
                                                      value={
                                                        rowSliderValues[
                                                          rowKey
                                                        ] ||
                                                        getDefaultSliderValue(
                                                          route.start_times,
                                                        )
                                                      }
                                                      onChange={(e) =>
                                                        updateSliderValue(
                                                          rowKey,
                                                          parseInt(
                                                            e.target.value,
                                                          ),
                                                        )
                                                      }
                                                      className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
                                                    />
                                                    <div className='flex justify-between text-xs text-gray-500 mt-1'>
                                                      <span>12:00 AM</span>
                                                      <span>11:54 PM</span>
                                                    </div>
                                                  </div>
                                                  <div className='flex-1'>
                                                    <label className='block font-medium mb-2'>
                                                      Hiking Speed:{' '}
                                                      {(
                                                        rowSpeedValues[
                                                          rowKey
                                                        ] || speed
                                                      ).toFixed(1)}{' '}
                                                      mph
                                                    </label>
                                                    <input
                                                      type='range'
                                                      min='0.2'
                                                      max='3.0'
                                                      step='0.1'
                                                      value={
                                                        rowSpeedValues[
                                                          rowKey
                                                        ] || speed
                                                      }
                                                      onChange={(e) =>
                                                        updateSpeedValue(
                                                          rowKey,
                                                          parseFloat(
                                                            e.target.value,
                                                          ),
                                                        )
                                                      }
                                                      className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
                                                    />
                                                    <div className='flex justify-between text-xs text-gray-500 mt-1'>
                                                      <span>0.2 mph</span>
                                                      <span>3.0 mph</span>
                                                    </div>
                                                  </div>
                                                  <div
                                                    style={{
                                                      marginTop: '1rem',
                                                    }}
                                                  >
                                                    <button
                                                      onClick={() =>
                                                        handlePlotRoute(
                                                          rowKey,
                                                          route,
                                                        )
                                                      }
                                                      className='px-4 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600 transition-colors'
                                                    >
                                                      Plot route
                                                    </button>
                                                  </div>
                                                </div>
                                                {plotResponses.map(
                                                  (entry, i) =>
                                                    entry.rowKey === rowKey && (
                                                      <div
                                                        key={i}
                                                        className='mt-4 p-3 bg-gray-100 rounded-md mx-auto flex flex-col items-center'
                                                      >
                                                        <Plot
                                                          key={`${rowKey}-${i}`}
                                                          data={entry.data}
                                                          layout={{
                                                            ...entry.layout,
                                                            autosize: false,
                                                            ...getPlotDimensions(),
                                                            margin: {
                                                              t: 30,
                                                              r: 30,
                                                              b: 40,
                                                              l: 40,
                                                            },
                                                          }}
                                                          config={{
                                                            responsive: true,
                                                          }}
                                                        />
                                                        {entry.layout.meta
                                                          ?.ozette_river_warning && (
                                                          <div className='mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm text-gray-700'>
                                                            * From the National
                                                            Park Service: "The
                                                            Ozette River must be
                                                            forded. The crossing
                                                            may be impossible in
                                                            winter and can be
                                                            hazardous year round
                                                            at high tide and/or
                                                            after heavy rain. It
                                                            is recommended to
                                                            ford at low tide."
                                                          </div>
                                                        )}
                                                      </div>
                                                    ),
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  },
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className='w-fit mx-auto mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
        <h3 className='text-lg font-semibold text-gray-800 mb-3 text-center'>
          Recommended Resources
        </h3>
        <div className='text-sm'>
          <a
            href='https://metskermaps.com/collections/custom-correct-maps'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline font-medium'
          >
            Custom Correct Topo Maps
          </a>
          <span className='mx-2 text-gray-500'>|</span>
          <a
            href='https://www.nps.gov/olym/planyourvisit/wilderness-coast.htm'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline font-medium'
          >
            Hiking the Wilderness Coast
          </a>
          <span className='mx-2 text-gray-500'>|</span>
          <a
            href='https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=9442396'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:text-blue-800 underline font-medium'
          >
            Tide Tables for La Push
          </a>
        </div>
      </div>

      <div className='w-fit mx-auto mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
        <p className='text-sm text-gray-700 text-center'>
          <strong>Disclaimer:</strong> While this tool is designed to assist
          with planning, it is not intended to be a replacement for more
          detailed analysis on the part of the hiker. Any route suggestions
          provided should be checked against the latest maps, tide tables, and
          any information provided by Olympic National Park, the Ozette Indian
          Reservation, and the Makah Reservation.
        </p>
      </div>
    </main>
  );
}

export default App;
