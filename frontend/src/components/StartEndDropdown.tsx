import { useEffect, useState } from 'react';

type Option = {
  id: string;
  label: string;
  section: string; // Grouping category
};

interface StartEndDropdownProps {
  onSelect?: (label: string) => void;
  initialLabel?: string;
  title?: string;
}

const options: Option[] = [
  // Current active locations
  { id: 'oil-city', label: 'Oil City', section: 'Coastline' },
  { id: 'la-push', label: 'La Push Road', section: 'Coastline' },
  { id: 'rialto', label: 'Rialto Beach', section: 'Coastline' },
  { id: 'ozette', label: 'Ozette Trailhead', section: 'Coastline' },
  { id: 'shi-shi', label: 'Shi Shi Beach', section: 'Coastline' },

  // Placeholder section for later use
  {
    id: 'future-1',
    label: 'Second Beach (Coming Soon)',
    section: 'Future Locations',
  },
  {
    id: 'future-2',
    label: 'Third Beach (Coming Soon)',
    section: 'Future Locations',
  },
];

export default function StartEndDropdown({
  onSelect,
  initialLabel,
  title = 'Location',
}: StartEndDropdownProps) {
  const [selectedValue, setSelectedValue] = useState<string>(options[0].label);

  // Group options by section
  const groupedOptions = options.reduce(
    (acc, opt) => {
      if (!acc[opt.section]) acc[opt.section] = [];
      acc[opt.section].push(opt);
      return acc;
    },
    {} as Record<string, Option[]>,
  );

  useEffect(() => {
    const targetLabel = initialLabel || options[0].label;
    const matchingOption = options.find((opt) => opt.label === targetLabel);
    if (matchingOption) {
      setSelectedValue(matchingOption.label);
    }
  }, [initialLabel]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    setSelectedValue(label);
    if (onSelect) {
      onSelect(label);
    }
  };

  return (
    <div className='mb-4'>
      <label className='block text-m font-semibold text-gray-700 mb-2'>
        {title}:
      </label>
      <select
        value={selectedValue}
        onChange={handleChange}
        className='w-full h-10 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800'
      >
        {Object.entries(groupedOptions).map(([sectionName, sectionItems]) => (
          <optgroup key={sectionName} label={sectionName}>
            {sectionItems.map((opt) => (
              <option key={opt.id} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
