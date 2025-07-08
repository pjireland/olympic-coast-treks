import { useState } from 'react';
import './App.css';

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
    return new Date(dateString).toLocaleDateString();
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

  return (
    <main className='min-h-screen bg-gray-100 p-8'>
      <div className='w-fit mx-auto bg-white p-6 rounded-lg shadow-md text-left'>
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
        <div className='w-full max-w-6xl mx-auto mt-8 bg-white p-6 rounded-lg shadow-md text-left'>
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
                    {} as Record<
                      string,
                      {
                        campsite_combination: number;
                        date: string;
                        start_location: string;
                        end_location: string;
                        distance: number;
                        start_times: { first: string; last: string }[];
                        end_times: { first: string; last: string }[];
                      }
                    >,
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
                                (route, routeIndex) => (
                                  <tr
                                    key={`${route.campsite_combination}-${route.date}-${routeIndex}`}
                                    className='hover:bg-gray-50'
                                  >
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
                                ),
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
    </main>
  );
}

export default App;
