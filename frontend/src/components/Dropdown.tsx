import { useEffect, useState } from 'react';

type Option = {
  label: string;
  direction: string;
  section: string;
};

interface DropdownProps {
  onSelect?: (direction: string, section: string) => void;
  initialDirection?: string;
  initialSection?: string;
}

const options: Option[] = [
  {
    label: 'Oil City → La Push Road',
    direction: 'north',
    section: 'south',
  },
  {
    label: 'La Push Road → Oil City',
    direction: 'south',
    section: 'south',
  },
  {
    label: 'Rialto Beach → Ozette Trailhead',
    direction: 'north',
    section: 'middle',
  },
  {
    label: 'Ozette Trailhead → Rialto Beach',
    direction: 'south',
    section: 'middle',
  },
  {
    label: 'Ozette Trailhead → Shi Shi Beach',
    direction: 'north',
    section: 'north',
  },
  {
    label: 'Shi Shi Beach → Ozette Trailhead',
    direction: 'south',
    section: 'north',
  },
];

export default function Dropdown({
  onSelect,
  initialDirection,
  initialSection,
}: DropdownProps) {
  const [selectedValue, setSelectedValue] = useState<string>(options[0].label);

  useEffect(() => {
    if (initialDirection && initialSection) {
      const matchingOption = options.find(
        (opt) =>
          opt.direction === initialDirection && opt.section === initialSection,
      );
      if (matchingOption) {
        setSelectedValue(matchingOption.label);
      }
    } else {
      // If no initial values, set default to first option and call onSelect
      setSelectedValue(options[0].label);
      if (onSelect) {
        onSelect(options[0].direction, options[0].section);
      }
    }
  }, [initialDirection, initialSection, onSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    setSelectedValue(label);
    const selected = options.find((opt) => opt.label === label);
    if (selected && onSelect) {
      onSelect(selected.direction, selected.section);
    }
  };

  return (
    <div className='mb-4'>
      <label className='block text-m font-semibold text-gray-700 mb-2'>
        Segment:
      </label>
      <select
        value={selectedValue}
        onChange={handleChange}
        className='w-full h-10 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800'
      >
        {options.map((opt) => (
          <option key={opt.label} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
