const DateRangePicker = ({ startDate, setStartDate, endDate, setEndDate }) => {

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Calculate max end date (1 week from start date)
    const getMaxEndDate = (startDateValue) => {
        if (!startDateValue) return '';

        const start = new Date(startDateValue);
        const maxEnd = new Date(start);
        maxEnd.setDate(start.getDate() + 7);
        return maxEnd.toISOString().split('T')[0];
    };

    // Calculate min end date (1 day after start date)
    const getMinEndDate = (startDateValue) => {
        if (!startDateValue) return '';

        const start = new Date(startDateValue);
        const minEnd = new Date(start);
        minEnd.setDate(start.getDate() + 1);
        return minEnd.toISOString().split('T')[0];
    };

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);

        // Set default end date to 2 days from start date
        if (newStartDate) {
            const startDateObj = new Date(newStartDate);
            const defaultEndDate = new Date(startDateObj);
            defaultEndDate.setDate(startDateObj.getDate() + 2);
            const defaultEndDateStr = defaultEndDate.toISOString().split('T')[0];
            setEndDate(defaultEndDateStr);
        } else {
            setEndDate('');
        }
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
    };

    return (
        <div className="mb-4">
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-m font-semibold text-gray-700 mb-2">
                        Start date:
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={handleStartDateChange}
                        min={today}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-m font-semibold text-gray-700 mb-2">
                        End date:
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={handleEndDateChange}
                        min={getMinEndDate(startDate)}
                        max={getMaxEndDate(startDate)}
                        disabled={!startDate}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </div>
            </div>
        </div>
    );
};

export default DateRangePicker;
