import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

interface StartEndDropdownProps {
  onSelect?: (label: string) => void;
  initialLabel?: string;
  title?: string;
  dependsOn?: string;
}

export default function StartEndDropdown({
  onSelect,
  initialLabel,
  title = 'Location',
  dependsOn,
}: StartEndDropdownProps) {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Use a ref to keep track of the value for comparison inside useEffect
  // without triggering the dependency lint warning.
  const currentSelectionRef = useRef(selectedValue);

  useEffect(() => {
    async function fetchLocations() {
      const url = dependsOn
        ? `${API_BASE_URL}/accessible-locations?current_location_name=${encodeURIComponent(dependsOn)}`
        : `${API_BASE_URL}/locations`;

      if (dependsOn === '' && title.toLowerCase().includes('end')) {
        setLocations([]);
        setSelectedValue('');
        currentSelectionRef.current = '';
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok)
          throw new Error(`API request failed: ${response.status}`);

        const data = z.array(z.string()).parse(await response.json());
        setLocations(data);

        let nextValue = '';
        if (initialLabel && data.includes(initialLabel)) {
          nextValue = initialLabel;
        } else if (data.length > 0) {
          nextValue = data[0];
        }

        // Only update and notify if the value is actually different
        if (nextValue !== currentSelectionRef.current) {
          setSelectedValue(nextValue);
          currentSelectionRef.current = nextValue;
          if (onSelect) onSelect(nextValue);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    }

    void fetchLocations();
  }, [dependsOn, initialLabel, onSelect, title]); // selectedValue is no longer needed here

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    currentSelectionRef.current = value; // Keep the ref in sync
    if (onSelect) onSelect(value);
  };

  return (
    <div className='mb-4'>
      <label className='block text-m font-semibold text-gray-700 mb-2'>
        {title}:
      </label>
      <select
        value={selectedValue}
        onChange={handleChange}
        className='w-full h-10 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 disabled:bg-gray-100'
        disabled={loading || locations.length === 0}
      >
        {loading ? (
          <option>Loading...</option>
        ) : (
          <>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
