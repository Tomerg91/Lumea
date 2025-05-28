import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, Clock, MapPin } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './select';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Badge } from './badge';
import { Separator } from './separator';
import { timezoneService, TimezoneInfo, TimezoneGroup } from '../../services/timezoneService';

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showAutoDetect?: boolean;
  showCurrentTime?: boolean;
  groupByRegion?: boolean;
  className?: string;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select timezone...",
  disabled = false,
  showAutoDetect = true,
  showCurrentTime = true,
  groupByRegion = true,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detectedTimezone, setDetectedTimezone] = useState<TimezoneInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Get timezone data
  const allTimezones = useMemo(() => timezoneService.getAllTimezones(), []);
  const timezoneGroups = useMemo(() => timezoneService.getTimezonesByRegion(), []);
  
  // Filter timezones based on search query
  const filteredTimezones = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupByRegion ? timezoneGroups : allTimezones;
    }
    
    const filtered = timezoneService.searchTimezones(searchQuery);
    
    if (groupByRegion) {
      // Group filtered results by region
      const grouped = new Map<string, TimezoneInfo[]>();
      filtered.forEach(tz => {
        if (!grouped.has(tz.region)) {
          grouped.set(tz.region, []);
        }
        grouped.get(tz.region)!.push(tz);
      });
      
      return Array.from(grouped.entries()).map(([region, timezones]) => ({
        region,
        timezones: timezones.sort((a, b) => a.city.localeCompare(b.city))
      })).sort((a, b) => a.region.localeCompare(b.region));
    }
    
    return filtered;
  }, [searchQuery, groupByRegion, timezoneGroups, allTimezones]);

  // Get selected timezone info
  const selectedTimezone = useMemo(() => {
    return value ? timezoneService.getTimezoneInfo(value) : null;
  }, [value]);

  // Auto-detect timezone on mount
  useEffect(() => {
    if (showAutoDetect) {
      try {
        const detected = timezoneService.detectTimezone();
        setDetectedTimezone(detected);
      } catch (error) {
        console.warn('Failed to detect timezone:', error);
      }
    }
  }, [showAutoDetect]);

  // Update current time for selected timezone
  useEffect(() => {
    if (!showCurrentTime || !value) return;

    const updateTime = () => {
      try {
        const time = timezoneService.formatInTimezone(new Date(), value, 'HH:mm:ss');
        setCurrentTime(time);
      } catch (error) {
        console.warn('Failed to format time:', error);
        setCurrentTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [value, showCurrentTime]);

  const handleTimezoneSelect = (timezone: string) => {
    onChange(timezone);
    setOpen(false);
    setSearchQuery('');
  };

  const handleAutoDetect = () => {
    if (detectedTimezone) {
      onChange(detectedTimezone.value);
      setOpen(false);
    }
  };

  const renderTimezoneItem = (tz: TimezoneInfo) => (
    <CommandItem
      key={tz.value}
      value={tz.value}
      onSelect={() => handleTimezoneSelect(tz.value)}
      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
    >
      <div className="flex items-center space-x-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium">{tz.city}</div>
          <div className="text-sm text-muted-foreground">
            {tz.country} • {tz.label}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="text-xs">
          {tz.offset}
        </Badge>
        {timezoneService.observesDST(tz.value) && (
          <Badge variant="outline" className="text-xs">
            DST
          </Badge>
        )}
      </div>
    </CommandItem>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>
                {selectedTimezone 
                  ? `${selectedTimezone.city} (${selectedTimezone.offset})`
                  : placeholder
                }
              </span>
            </div>
            {showCurrentTime && currentTime && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{currentTime}</span>
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search timezones..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            {showAutoDetect && detectedTimezone && (
              <>
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAutoDetect}
                    className="w-full justify-start"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Auto-detect: {detectedTimezone.city} ({detectedTimezone.offset})
                  </Button>
                </div>
                <Separator />
              </>
            )}

            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>No timezone found.</CommandEmpty>
              
              {groupByRegion ? (
                // Grouped view
                (filteredTimezones as TimezoneGroup[]).map((group) => (
                  <CommandGroup key={group.region} heading={group.region}>
                    {group.timezones.map(renderTimezoneItem)}
                  </CommandGroup>
                ))
              ) : (
                // Flat view
                <CommandGroup>
                  {(filteredTimezones as TimezoneInfo[]).map(renderTimezoneItem)}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Additional timezone info */}
      {selectedTimezone && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Region: {selectedTimezone.region}</span>
            <span>Offset: {selectedTimezone.offset}</span>
          </div>
          {timezoneService.observesDST(selectedTimezone.value) && (
            <div className="text-amber-600">
              ⚠️ This timezone observes Daylight Saving Time
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimezoneSelector; 