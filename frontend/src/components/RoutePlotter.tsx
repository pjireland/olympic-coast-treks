/* eslint-disable react-refresh/only-export-components */

import type { Layout, PlotData } from 'plotly.js-basic-dist';
import React from 'react';
import Plot from 'react-plotly.js';
import { z } from 'zod/v4';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

// Types
interface PlotResponse {
  data: PlotData[];
  layout: Partial<Layout> & { meta?: { ozette_river_warning?: boolean } };
}

export type PlotEntry = PlotResponse & {
  rowKey: string;
};

export type MergedRoute = {
  campsite_combination: number;
  date: string;
  start_location: string;
  end_location: string;
  distance: number;
  start_times: { first: string; last: string }[];
  end_times: { first: string; last: string }[];
};

interface RoutePlotterProps {
  rowKey: string;
  route: MergedRoute;
  speed: number;
  rowSliderValues: Record<string, number>;
  rowSpeedValues: Record<string, number>;
  plotResponses: PlotEntry[];
  setRowSliderValues: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  setRowSpeedValues: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  onPlotRoute: (rowKey: string, route: MergedRoute) => void;
  getPlotDimensions: () => { width: number; height: number };
}

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
    .loose(), // Allows all other Layout properties
});

// Helper functions
export const timeToMinutes = (timeString: string): number => {
  const date = new Date(timeString);
  return date.getHours() * 60 + date.getMinutes();
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

export const roundToNearestSixMinutes = (minutes: number): number => {
  return Math.round(minutes / 6) * 6;
};

export const getDefaultSliderValue = (
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

export const handlePlotRouteAPI = async (
  rowKey: string,
  route: MergedRoute,
  departureTime: number,
  hikingSpeed: number,
  setPlotResponses: React.Dispatch<React.SetStateAction<PlotEntry[]>>,
) => {
  const hours = Math.floor(departureTime / 60);
  const minutes = departureTime % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startTime = route.date + 'T' + pad(hours) + ':' + pad(minutes);

  try {
    // Build query parameters for GET request
    const params = new URLSearchParams();
    params.set('start_time', startTime);
    params.set('start_location', route.start_location);
    params.set('end_location', route.end_location);
    params.set('speed', hikingSpeed.toString());

    const response = await fetch(`${API_BASE_URL}/plot?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const responseData: PlotResponse = PlotResponseSchema.parse(
      await response.json(),
    );

    // Store the response in state so we can display it
    setPlotResponses((prev) => {
      const filteredResponses = prev.filter((entry) => entry.rowKey !== rowKey);
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

// Component as default export
const RoutePlotter: React.FC<RoutePlotterProps> = ({
  rowKey,
  route,
  speed,
  rowSliderValues,
  rowSpeedValues,
  plotResponses,
  setRowSliderValues,
  setRowSpeedValues,
  onPlotRoute,
  getPlotDimensions,
}) => {
  const currentSliderValue =
    rowSliderValues[rowKey] || getDefaultSliderValue(route.start_times);
  const currentSpeedValue = rowSpeedValues[rowKey] || speed;

  const handleSliderChange = (value: number) => {
    setRowSliderValues((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
  };

  const handleSpeedChange = (value: number) => {
    setRowSpeedValues((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
  };

  return (
    <div className='text-sm text-gray-700 space-y-3 pl-14 pr-6'>
      <div className='flex gap-6 items-start'>
        <div className='flex-1'>
          <label className='block font-medium mb-2'>
            Departure Time: {minutesToTime(currentSliderValue)}
          </label>
          <input
            type='range'
            min='0'
            max='1434' // 11:54 PM = 23*60 + 54 = 1434 minutes
            step='6'
            value={currentSliderValue}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
          />
          <div className='flex justify-between text-xs text-gray-500 mt-1'>
            <span>12:00 AM</span>
            <span>11:54 PM</span>
          </div>
        </div>
        <div className='flex-1'>
          <label className='block font-medium mb-2'>
            Hiking Speed: {currentSpeedValue.toFixed(1)} mph
          </label>
          <input
            type='range'
            min='0.2'
            max='3.0'
            step='0.1'
            value={currentSpeedValue}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
          />
          <div className='flex justify-between text-xs text-gray-500 mt-1'>
            <span>0.2 mph</span>
            <span>3.0 mph</span>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => onPlotRoute(rowKey, route)}
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
              {entry.layout.meta?.ozette_river_warning && (
                <div className='mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm text-gray-700'>
                  * From the National Park Service: "The Ozette River must be
                  forded. The crossing may be impossible in winter and can be
                  hazardous year round at high tide and/or after heavy rain. It
                  is recommended to ford at low tide."
                </div>
              )}
            </div>
          ),
      )}
    </div>
  );
};

export default RoutePlotter;
