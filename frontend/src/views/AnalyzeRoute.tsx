import '../App.css';

import { useEffect, useState } from 'react';
import { z } from 'zod/v4';

import DatePicker from '../components/DatePicker';
import HikingSpeedSlider from '../components/HikingSpeedSlider';
import RoutePlotter, {
  getDefaultSliderValue,
  handlePlotRouteAPI,
  type MergedRoute,
  type PlotEntry,
} from '../components/RoutePlotter';
import StartEndDropdown from '../components/StartEndDropdown';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

const PlotResponseSchema = z.object({
  data: z.array(z.any()),
  layout: z
    .object({
      meta: z
        .object({
          ozette_river_warning: z.boolean().optional(),
        })
        .optional(),
    })
    .loose(),
});

function App() {
  const getQueryParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      start_location: params.get('start_location') || 'Oil City',
      end_location: params.get('end_location') || 'La Push Road',
      start_date: params.get('start_date') || '',
      speed: parseFloat(params.get('speed') || '1.0'),
    };
  };

  const initialParams = getQueryParams();

  const [startLocation, setStartLocation] = useState(
    initialParams.start_location,
  );
  const [endLocation, setEndLocation] = useState(initialParams.end_location);
  const [startDate, setStartDate] = useState(initialParams.start_date);
  const [speed, setSpeed] = useState(initialParams.speed);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [mockRoute, setMockRoute] = useState<MergedRoute | null>(null);
  const [plotResponses, setPlotResponses] = useState<PlotEntry[]>([]);
  const [rowSliderValues, setRowSliderValues] = useState<
    Record<string, number>
  >({});
  const [rowSpeedValues, setRowSpeedValues] = useState<Record<string, number>>(
    {},
  );

  const isValidInput = startDate && startLocation && endLocation;
  const activeRowKey = `${startLocation}-${endLocation}`;

  const handlePlotRoute = async (rowKey: string, route: MergedRoute) => {
    setError(null);
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

  const callAPI = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setPlotResponses([]);

    try {
      // 1. Ensure we have a valid base date string, then append 10:00 AM local time
      // If startDate is "2026-06-17", combinedTime becomes "2026-06-17T10:00:00"
      const combinedTime = startDate
        ? `${startDate.split('T')[0]}T10:00:00`
        : '';

      const params = new URLSearchParams();
      params.set('start_time', combinedTime);
      params.set('start_location', startLocation);
      params.set('end_location', endLocation);
      params.set('speed', speed.toString());

      const response = await fetch(
        `${API_BASE_URL}/plot?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok)
        throw new Error(`API request failed: ${response.status}`);

      const json = await response.json();
      const responseData = PlotResponseSchema.parse(json);

      // 2. Pass this same 10:00 AM timestamp down to the dummy route framework
      // so RoutePlotter reads 10:00 AM (600 minutes) as its initial default slider position.
      const dummyRoute: MergedRoute = {
        campsite_combination: 1,
        date: startDate.split('T')[0],
        start_location: startLocation,
        end_location: endLocation,
        distance: 0,
        start_times: [{ first: combinedTime, last: combinedTime }],
        end_times: [],
      };

      setMockRoute(dummyRoute);

      setPlotResponses([
        {
          rowKey: activeRowKey,
          data: responseData.data,
          layout: responseData.layout,
        },
      ]);

      window.history.pushState(
        {},
        '',
        `${window.location.pathname}?${params.toString()}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching the plot',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // NEW EFFECT: Auto-updates the graph whenever the user toggles locations or dates
  useEffect(() => {
    if (isValidInput) {
      void callAPI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLocation, endLocation, startDate]);

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
            <StartEndDropdown
              title='Start at'
              onSelect={(val) => setStartLocation(val)}
            />
            <StartEndDropdown
              title='End at'
              dependsOn={startLocation}
              onSelect={(val) => setEndLocation(val)}
            />
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>

          <HikingSpeedSlider speed={speed} setSpeed={setSpeed} />

          {/* Optional: Kept the button here as a manual fallback, though updates are now reactive */}
          <div className='w-fit rounded-lg text-left mt-4'>
            <button
              onClick={() => {
                void callAPI();
              }}
              disabled={!isValidInput || isLoading}
              className={`px-4 py-2 rounded-md font-semibold ${
                isValidInput && !isLoading
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Plotting...' : 'Analyze route'}
            </button>
          </div>
        </div>

        {hasSearched && (
          <div className='bg-white p-6 pt-4 rounded-b-lg shadow-md text-left'>
            {error && (
              <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
                <strong>Error:</strong> {error}
              </div>
            )}

            {isLoading && (
              <div className='text-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 inline-block'></div>
                <p className='mt-2 text-gray-600'>Generating plot...</p>
              </div>
            )}

            {!isLoading && !error && mockRoute && (
              <div className='bg-gray-50 p-4 rounded-lg'>
                <RoutePlotter
                  rowKey={activeRowKey}
                  route={mockRoute}
                  speed={speed}
                  rowSliderValues={rowSliderValues}
                  rowSpeedValues={rowSpeedValues}
                  plotResponses={plotResponses}
                  setRowSliderValues={setRowSliderValues}
                  setRowSpeedValues={setRowSpeedValues}
                  onPlotRoute={(...args) => {
                    void handlePlotRoute(...args);
                  }}
                  getPlotDimensions={getPlotDimensions}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
