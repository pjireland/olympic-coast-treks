interface HikingSpeedSliderProps {
  speed: number;
  setSpeed: (speed: number) => void;
}

export default function HikingSpeedSlider({
  speed,
  setSpeed,
}: HikingSpeedSliderProps) {
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseFloat(e.target.value));
  };

  return (
    <div className="mb-4">
      <label className="block text-m font-semibold text-gray-700 mb-0">
        Hiking speed: {speed.toFixed(1)} mph
      </label>

      <input
        type="range"
        min="0.2"
        max="3.0"
        step="0.1"
        value={speed}
        onChange={handleSpeedChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />

      {speed > 1.0 && (
        <div className="mt-0 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
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
              Hiking speeds above 1 mph can be difficult due to uneven terrain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
