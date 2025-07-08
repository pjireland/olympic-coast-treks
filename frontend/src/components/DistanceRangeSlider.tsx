interface DistanceRangeSliderProps {
  minDistance: number;
  setMinDistance: (minDistance: number) => void;
  maxDistance: number;
  setMaxDistance: (maxDistance: number) => void;
}

export default function DistanceRangeSlider({
  minDistance,
  setMinDistance,
  maxDistance,
  setMaxDistance,
}: DistanceRangeSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    // Ensure min doesn't exceed max
    if (value <= maxDistance) {
      setMinDistance(value);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    // Ensure max doesn't go below min
    if (value >= minDistance) {
      setMaxDistance(value);
    }
  };

  // Calculate positions for the range highlight
  const minPercent = ((minDistance - 0.1) / (15 - 0.1)) * 100;
  const maxPercent = ((maxDistance - 0.1) / (15 - 0.1)) * 100;

  return (
    <div className={maxDistance > 10 ? "mb-3" : "mb-10"}>
      <label className="block text-m font-semibold text-gray-700 mb-3">
        Distance per day: {minDistance.toFixed(1)} – {maxDistance.toFixed(1)}{" "}
        miles
      </label>
      <div className="relative">
        {/* Track background */}
        <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-2 bg-gray-200 rounded-lg"></div>

        {/* Highlighted range */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 h-2 bg-blue-500 rounded-lg"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        ></div>

        {/* Min slider */}
        <input
          type="range"
          min="0.1"
          max="15"
          step="0.1"
          value={minDistance}
          onChange={handleMinChange}
          className="absolute w-full h-0 bg-transparent appearance-none cursor-pointer slider-thumb min-slider"
          style={{ zIndex: 1 }}
        />

        {/* Max slider */}
        <input
          type="range"
          min="0.1"
          max="15"
          step="0.1"
          value={maxDistance}
          onChange={handleMaxChange}
          className="absolute w-full h-0 bg-transparent appearance-none cursor-pointer slider-thumb max-slider"
          style={{ zIndex: 2 }}
        />
      </div>

      {maxDistance > 10 && (
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-yellow-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              It's difficult to hike more than 10 miles per day due to uneven
              terrain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
