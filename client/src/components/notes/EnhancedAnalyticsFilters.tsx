import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Filter, 
  Calendar, 
  User, 
  Tag, 
  Search,
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface AnalyticsFilter {
  dateRange: {
    startDate: string;
    endDate: string;
    preset: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
  clients: string[];
  tags: string[];
  searchQuery: string;
  noteTypes: string[];
  sessionTypes: string[];
  wordCountRange: {
    min: number;
    max: number;
  };
}

interface EnhancedAnalyticsFiltersProps {
  filters: AnalyticsFilter;
  onFiltersChange: (filters: AnalyticsFilter) => void;
  availableClients: Array<{ id: string; name: string }>;
  availableTags: string[];
  availableNoteTypes: string[];
  availableSessionTypes: string[];
  onExportFiltered?: (format: 'json' | 'csv' | 'pdf') => void;
}

export const EnhancedAnalyticsFilters: React.FC<EnhancedAnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  availableClients,
  availableTags,
  availableNoteTypes,
  availableSessionTypes,
  onExportFiltered
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<AnalyticsFilter>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilter = (filterType: keyof AnalyticsFilter) => {
    switch (filterType) {
      case 'dateRange':
        updateFilters({
          dateRange: {
            startDate: '',
            endDate: '',
            preset: 'month'
          }
        });
        break;
      case 'clients':
        updateFilters({ clients: [] });
        break;
      case 'tags':
        updateFilters({ tags: [] });
        break;
      case 'searchQuery':
        updateFilters({ searchQuery: '' });
        break;
      case 'noteTypes':
        updateFilters({ noteTypes: [] });
        break;
      case 'sessionTypes':
        updateFilters({ sessionTypes: [] });
        break;
      case 'wordCountRange':
        updateFilters({ wordCountRange: { min: 0, max: 1000 } });
        break;
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: {
        startDate: '',
        endDate: '',
        preset: 'month'
      },
      clients: [],
      tags: [],
      searchQuery: '',
      noteTypes: [],
      sessionTypes: [],
      wordCountRange: { min: 0, max: 1000 }
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.clients.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.noteTypes.length > 0) count++;
    if (filters.sessionTypes.length > 0) count++;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.wordCountRange.min > 0 || filters.wordCountRange.max < 1000) count++;
    return count;
  };

  const datePresets = [
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last Quarter' },
    { value: 'year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-blue-600" />
            Analytics Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Query */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search notes content, titles, or insights..."
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="pl-10"
            />
            {filters.searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter('searchQuery')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Tags */}
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              Search: "{filters.searchQuery}"
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => clearFilter('searchQuery')}
              />
            </Badge>
          )}
          
          {filters.clients.map(clientId => {
            const client = availableClients.find(c => c.id === clientId);
            return (
              <Badge key={clientId} variant="outline" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {client?.name || clientId}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500"
                  onClick={() => updateFilters({ 
                    clients: filters.clients.filter(id => id !== clientId) 
                  })}
                />
              </Badge>
            );
          })}
          
          {filters.tags.map(tag => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {tag}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500"
                onClick={() => updateFilters({ 
                  tags: filters.tags.filter(t => t !== tag) 
                })}
              />
            </Badge>
          ))}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={filters.dateRange.preset}
                onChange={(e) => updateFilters({
                  dateRange: {
                    ...filters.dateRange,
                    preset: e.target.value as any
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {datePresets.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              
              {filters.dateRange.preset === 'custom' && (
                <div className="mt-2 space-y-2">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, startDate: e.target.value }
                    })}
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => updateFilters({
                      dateRange: { ...filters.dateRange, endDate: e.target.value }
                    })}
                  />
                </div>
              )}
            </div>

            {/* Clients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Clients
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.clients.length > 0 
                      ? `${filters.clients.length} selected`
                      : 'Select clients...'
                    }
                    <ChevronDown className="ml-auto w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableClients.map(client => (
                      <label key={client.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.clients.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilters({ clients: [...filters.clients, client.id] });
                            } else {
                              updateFilters({ 
                                clients: filters.clients.filter(id => id !== client.id) 
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{client.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.tags.length > 0 
                      ? `${filters.tags.length} selected`
                      : 'Select tags...'
                    }
                    <ChevronDown className="ml-auto w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableTags.map(tag => (
                      <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFilters({ tags: [...filters.tags, tag] });
                            } else {
                              updateFilters({ 
                                tags: filters.tags.filter(t => t !== tag) 
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Word Count Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Word Count Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.wordCountRange.min}
                  onChange={(e) => updateFilters({
                    wordCountRange: { 
                      ...filters.wordCountRange, 
                      min: parseInt(e.target.value) || 0 
                    }
                  })}
                  className="w-20"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.wordCountRange.max}
                  onChange={(e) => updateFilters({
                    wordCountRange: { 
                      ...filters.wordCountRange, 
                      max: parseInt(e.target.value) || 1000 
                    }
                  })}
                  className="w-20"
                />
              </div>
            </div>

            {/* Export Filtered Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Filtered Data
              </label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportFiltered?.('json')}
                  className="flex-1"
                >
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportFiltered?.('csv')}
                  className="flex-1"
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportFiltered?.('pdf')}
                  className="flex-1"
                >
                  PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 