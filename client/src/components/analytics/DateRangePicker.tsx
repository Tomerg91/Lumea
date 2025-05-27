import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (range: { startDate: Date; endDate: Date }) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    onChange({ startDate: newStartDate, endDate });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    onChange({ startDate, endDate: newEndDate });
  };

  const setPresetRange = (days: number) => {
    const newEndDate = new Date();
    const newStartDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onChange({ startDate: newStartDate, endDate: newEndDate });
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Calendar className="h-4 w-4 mr-2" />
        {formatDate(startDate)} - {formatDate(endDate)}
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 space-y-4">
            {/* Preset Ranges */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Select</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPresetRange(7)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  Last 7 days
                </button>
                <button
                  onClick={() => setPresetRange(30)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => setPresetRange(90)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  Last 90 days
                </button>
                <button
                  onClick={() => setPresetRange(365)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  Last year
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Range</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={handleStartDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate.toISOString().split('T')[0]}
                    onChange={handleEndDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end pt-2 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}; 