import { useState } from 'react'
import './App.css'

import Dropdown from './components/Dropdown';

function App() {
  const handleDropdownSelect = (direction: string, section: string) => {
    console.log('Selected direction:', direction);
    console.log('Selected section:', section);
    // You can store these in useState or trigger additional effects
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="w-fit mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Specify trek details</h1>
        <Dropdown
          onSelect={handleDropdownSelect}
        />
      </div>
    </main>
  );
}

export default App;
