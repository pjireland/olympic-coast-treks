import '../App.css';

import { Fragment, useEffect, useState } from 'react';
import { z } from 'zod/v4';

import DateRangePicker from '../components/DateRangePicker';
import DistanceRangeSlider from '../components/DistanceRangeSlider';
import HikingSpeedSlider from '../components/HikingSpeedSlider';
import RoutePlotter, {
  getDefaultSliderValue,
  handlePlotRouteAPI,
  type MergedRoute,
  type PlotEntry,
} from '../components/RoutePlotter';
import SectionDropdown from '../components/SectionDropdown';
import TidalBufferSlider from '../components/TidalBufferSlider';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

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

  const [results, setResults] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // States for expansion
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(
    new Set(),
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [rowSliderValues, setRowSliderValues] = useState<
    Record<string, number>
  >({});
  const [rowSpeedValues, setRowSpeedValues] = useState<Record<string, number>>(
    {},
  );
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

    // We don't reset expansion here because we'll overwrite them with all-expanded state below
    setRowSliderValues({});
    setRowSpeedValues({});
    setPlotResponses([]);

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
        `${API_BASE_URL}/routes?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) throw new Error(`API failed: ${response.status}`);

      const data: Route[] = z.array(RouteSchema).parse(await response.json());
      setResults(data);

      // --- EXPAND EVERYTHING BY DEFAULT ---
      const allOptionIds = new Set<number>();
      const allRowKeys = new Set<string>();

      data.forEach((route) => {
        allOptionIds.add(route.campsite_combination);
        // Deterministic key: Combination-Date-StartLocation
        allRowKeys.add(
          `${route.campsite_combination}-${route.date}-${route.start_location}`,
        );
      });

      setExpandedOptions(allOptionIds);
      setExpandedRows(allRowKeys);
      // ------------------------------------

      const urlParams = new URLSearchParams(params);
      window.history.pushState(
        {},
        '',
        `${window.location.pathname}?${urlParams.toString()}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      if (newSet.has(campsiteCombination)) newSet.delete(campsiteCombination);
      else newSet.add(campsiteCombination);
      return newSet;
    });
  };

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) newSet.delete(rowKey);
      else newSet.add(rowKey);
      return newSet;
    });
  };

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

  const getUniqueLocations = (routes: Route[]) => {
    const locationSet = new Set<string>();
    routes.forEach((route) => {
      locationSet.add(route.start_location);
      locationSet.add(route.end_location);
    });
    return Array.from(locationSet).slice(1, -1);
  };

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPlotDimensions = () => {
    const maxWidth = Math.min(windowSize.width, 800);
    return { width: maxWidth, height: Math.floor(maxWidth * 0.6) };
  };

  return (
    <main className='min-h-screen bg-gray-100 p-8'>
      <div className='w-fit mx-auto space-y-0'>
        <div className='bg-white p-6 rounded-t-lg shadow-md text-left'>
          <div className='flex gap-6 items-start'>
            <SectionDropdown
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
              className={`px-4 py-2 rounded-md font-semibold ${isValidInput && !isLoading ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {isLoading ? 'Searching...' : 'Find routes'}
            </button>
          </div>
        </div>

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
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 inline-block'></div>
                <p className='mt-2 text-gray-600'>Searching...</p>
              </div>
            )}

            {!isLoading && !error && results.length > 0 && (
              <div className='space-y-8'>
                {Object.entries(
                  results.reduce(
                    (groups, route) => {
                      const key = route.campsite_combination;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(route);
                      return groups;
                    },
                    {} as Record<number, Route[]>,
                  ),
                )
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([campsiteCombination, routes], index) => {
                    const uniqueLocations = getUniqueLocations(routes);
                    const mergedRoutes = routes.reduce(
                      (acc, route) => {
                        const key = `${route.campsite_combination}-${route.date}-${route.start_location}-${route.end_location}`;
                        if (!acc[key]) {
                          acc[key] = {
                            ...route,
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
                            className='w-5 h-5 text-lg font-bold text-gray-600 hover:text-gray-800 flex items-center justify-center bg-transparent'
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
                              {uniqueLocations.map((loc, i) => (
                                <span
                                  key={i}
                                  className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full'
                                >
                                  {loc}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {expandedOptions.has(Number(campsiteCombination)) && (
                          <div className='overflow-x-auto'>
                            <table className='w-full bg-white text-gray-900 text-sm'>
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
                                {Object.values(mergedRoutes).map((route) => {
                                  const rowKey = `${route.campsite_combination}-${route.date}-${route.start_location}`;
                                  const isRowExpanded =
                                    expandedRows.has(rowKey);

                                  return (
                                    <Fragment key={rowKey}>
                                      <tr className='hover:bg-gray-50 border-t border-gray-100'>
                                        <td className='px-4 py-2'>
                                          <button
                                            onClick={() => toggleRow(rowKey)}
                                            className='w-5 h-5 text-lg font-bold text-gray-600 hover:text-gray-800 flex items-center justify-center bg-transparent'
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
                                          {route.start_times.map((tw, i) => (
                                            <div key={i}>
                                              {formatTimeOnly(tw.first)} –{' '}
                                              {formatTimeOnly(tw.last)}
                                            </div>
                                          ))}
                                        </td>
                                        <td className='px-4 py-2'>
                                          {route.end_times.map((tw, i) => (
                                            <div key={i}>
                                              {formatTimeOnly(tw.first)} –{' '}
                                              {formatTimeOnly(tw.last)}
                                            </div>
                                          ))}
                                        </td>
                                      </tr>
                                      {isRowExpanded && (
                                        <tr className='bg-blue-50'>
                                          <td className='px-4 py-3' colSpan={7}>
                                            <RoutePlotter
                                              rowKey={rowKey}
                                              route={route}
                                              speed={speed}
                                              rowSliderValues={rowSliderValues}
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
                                })}
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
    </main>
  );
}

export default App;
