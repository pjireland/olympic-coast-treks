import './App.css';

import { Fragment, useEffect, useState } from 'react';
import { z } from 'zod/v4';

import DateRangePicker from './components/DateRangePicker';
import DistanceRangeSlider from './components/DistanceRangeSlider';
import Dropdown from './components/Dropdown';
import HikingSpeedSlider from './components/HikingSpeedSlider';
import RoutePlotter, {
  getDefaultSliderValue,
  handlePlotRouteAPI,
  type MergedRoute,
  type PlotEntry,
} from './components/RoutePlotter';
import TidalBufferSlider from './components/TidalBufferSlider';

const RouteSchema = z.object({
  campsite_combination: z.number(),
  date: z.string(),
  start_location: z.string(),
  end_location: z.string(),
  distance: z.number(),
  first_possible_start: z.string(),
  last_possible_start: z.string(),
  first_possible_end: z.string(),
  last_possible_end: z.string(),
});

type Route = z.infer<typeof RouteSchema>;

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

  // New state for route API results and loading
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
  const [plotResponses, setPlotResponses] = useState<PlotEntry[]>([]);

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

      const data: Route[] = z.array(RouteSchema).parse(await response.json());
      setResults(data);

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

  // Function to handle plot route button click
  const handlePlotRoute = async (rowKey: string, route: MergedRoute) => {
    const departureTime =
      rowSliderValues[rowKey] || getDefaultSliderValue(route.start_times);
    const hikingSpeed = rowSpeedValues[rowKey] || speed;

    await handlePlotRouteAPI(
      rowKey,
      route,
      departureTime,
      hikingSpeed,
      setPlotResponses,
    );
  };

  // Helper function to get unique campsites for a set of routes
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

  const getPlotDimensions = () => {
    if (typeof windowSize !== 'undefined') {
      const maxWidth = Math.min(windowSize.width, 800);
      const height = Math.floor(maxWidth * 0.6);

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
              onClick={() => {
                callAPI().catch(console.error);
              }}
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
                  Try adjusting your parameters and searching again.
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
                                      <Fragment key={rowKey}>
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
                                              <RoutePlotter
                                                rowKey={rowKey}
                                                route={route}
                                                speed={speed}
                                                rowSliderValues={
                                                  rowSliderValues
                                                }
                                                rowSpeedValues={rowSpeedValues}
                                                plotResponses={plotResponses}
                                                setRowSliderValues={
                                                  setRowSliderValues
                                                }
                                                setRowSpeedValues={
                                                  setRowSpeedValues
                                                }
                                                onPlotRoute={(...args) => {
                                                  void handlePlotRoute(...args);
                                                }}
                                                getPlotDimensions={
                                                  getPlotDimensions
                                                }
                                              />
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
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
          <div className='mb-3'>
            <a
              href='https://metskermaps.com/collections/custom-correct-maps'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 underline font-medium'
            >
              Custom Correct Maps
            </a>
            : Recommended maps for the Olympic Coast. Much of the distance and
            restriction data in this tool is based on these maps.
          </div>
          <div className='mb-3'>
            <a
              href='https://www.nps.gov/olym/planyourvisit/wilderness-coast.htm'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 underline font-medium'
            >
              Hiking the Wilderness Coast
            </a>
            : Information from the National Park Service, including the latest
            trail conditions and hazards.
          </div>
          <div className='mb-3'>
            <a
              href='https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=9442396'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 underline font-medium'
            >
              Tide Tables for La Push
            </a>
            : NOAA tide tables for La Push, Washington. Used for determining
            tide levels in this tool.
          </div>
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
