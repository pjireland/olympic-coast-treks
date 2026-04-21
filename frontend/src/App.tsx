import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';

import AnalyzeRoute from './views/AnalyzeRoute';
import FindRoutes from './views/FindRoutes';

function App() {
  return (
    <BrowserRouter>
      <main className='min-h-screen bg-gray-100 p-8'>
        <h1 className='text-4xl font-bold text-gray-800 text-center mb-4'>
          Olympic Coast Trek Planner
        </h1>

        {/* Navigation Tabs */}
        <div className='flex justify-center mb-8'>
          <nav className='bg-gray-200 p-1 rounded-lg inline-flex shadow-inner'>
            <NavLink
              to='/find'
              className={({ isActive }) =>
                `px-6 py-2 rounded-md font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`
              }
            >
              Find Routes
            </NavLink>
            <NavLink
              to='/analyze'
              className={({ isActive }) =>
                `px-6 py-2 rounded-md font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`
              }
            >
              Analyze Route
            </NavLink>
          </nav>
        </div>

        {/* Route Definitions */}
        <div className='max-w-6xl mx-auto'>
          <Routes>
            <Route path='/find' element={<FindRoutes />} />
            <Route path='/analyze' element={<AnalyzeRoute />} />
            <Route path='/' element={<Navigate to='/find' replace />} />
          </Routes>
        </div>

        {/* Persistent Disclaimer (Shared across all pages) */}
        <div className='w-fit mx-auto mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
          <h3 className='text-lg font-semibold text-gray-800 mb-3 text-center'>
            Recommended Resources
          </h3>
          <div className='text-sm text-gray-900'>
            <div className='mb-3'>
              <a
                href='https://metskermaps.com/collections/custom-correct-maps'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 underline font-medium'
              >
                Custom Correct Maps
              </a>
              : Recommended maps for the Olympic Coast. Much of the distance and
              restriction data in this tool is based on these maps.
            </div>
            <div className='mb-3 text-gray-900'>
              <a
                href='https://www.nps.gov/olym/planyourvisit/wilderness-coast.htm'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 underline font-medium'
              >
                Hiking the Wilderness Coast
              </a>
              : Information from the National Park Service, including the latest
              trail conditions and hazards.
            </div>
            <div className='mb-3 text-gray-900'>
              <a
                href='https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=9442396'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 underline font-medium'
              >
                Tide Tables for La Push
              </a>
              : NOAA tide tables for La Push, Washington. Used for determining
              tide levels in this tool.
            </div>
          </div>
        </div>

        <div className='w-fit mx-auto mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <p className='text-sm text-gray-700 text-center'>
            <strong>Disclaimer:</strong> While this tool is designed to assist
            with planning, it is not intended to be a replacement for more
            detailed analysis on the part of the hiker. Any route suggestions
            provided should be checked against the latest maps, tide tables, and
            any information provided by Olympic National Park, the Ozette Indian
            Reservation, and the Makah Reservation.
          </p>
        </div>
      </main>
    </BrowserRouter>
  );
}

export default App;
