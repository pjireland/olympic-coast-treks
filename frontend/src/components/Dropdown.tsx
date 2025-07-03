import { useState } from 'react';

type Option = {
    label: string;
    direction: string;
    section: string;
};

interface DropdownProps {
    label: string;
    onSelect?: (direction: string, section: string) => void;
}

export default function Dropdown({ label, onSelect }: DropdownProps) {
    const [selectedValue, setSelectedValue] = useState<string>('');

    const options: Option[] = [
        {
            label: 'Oil City → La Push Road (South Coast)',
            direction: 'north',
            section: 'south',
        },
        {
            label: 'La Push Road → Oil City (South Coast)',
            direction: 'south',
            section: 'south',
        },
        {
            label: 'Rialto Beach → Ozette Trailhead (South Section of North Coast)',
            direction: 'north',
            section: 'middle',
        },
        {
            label: 'Ozette Trailhead → Rialto Beach (South Section of North Coast)',
            direction: 'south',
            section: 'middle',
        },
        {
            label: 'Ozette Trailhead → Shi Shi Beach (North Section of North Coast)',
            direction: 'north',
            section: 'north',
        },
        {
            label: 'Shi Shi Beach → Ozette Trailhead (North Section of North Coast)',
            direction: 'south',
            section: 'north',
        },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const label = e.target.value;
        setSelectedValue(label);
        const selected = options.find((opt) => opt.label === label);
        if (selected && onSelect) {
            onSelect(selected.direction, selected.section);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-m font-semibold text-gray-700 mb-2">
                Start and end location:
            </label>
            <select
                value={selectedValue}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
            >
                <option value="" disabled></option>
                {options.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
