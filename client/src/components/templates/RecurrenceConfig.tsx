import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Repeat,
  AlertCircle,
  X
} from 'lucide-react';
import { RecurrenceConfig as IRecurrenceConfig, RecurrencePattern } from '../../types/sessionTemplate';
import { format, addDays, addWeeks, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';

interface RecurrenceConfigProps {
  config?: IRecurrenceConfig | null;
  onChange: (config: IRecurrenceConfig | null) => void;
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const RecurrenceConfig: React.FC<RecurrenceConfigProps> = ({
  config,
  onChange,
  isEnabled,
  onEnabledChange,
}) => {
  const { t } = useTranslation();

  // Local state for the configuration
  const [pattern, setPattern] = useState<RecurrencePattern>('weekly');
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [maxOccurrences, setMaxOccurrences] = useState<number | null>(null);
  const [endType, setEndType] = useState<'never' | 'date' | 'occurrences'>('never');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Initialize from props
  useEffect(() => {
    if (config) {
      setPattern(config.pattern);
      setInterval(config.interval);
      setDaysOfWeek(config.daysOfWeek || []);
      setDayOfMonth(config.dayOfMonth || 1);
      setEndDate(config.endDate ? parseISO(config.endDate.toString()) : null);
      setMaxOccurrences(config.maxOccurrences || null);
      
      if (config.endDate) {
        setEndType('date');
      } else if (config.maxOccurrences) {
        setEndType('occurrences');
      } else {
        setEndType('never');
      }
    }
  }, [config]);

  // Update parent when local state changes
  useEffect(() => {
    if (!isEnabled) {
      onChange(null);
      return;
    }

    const newConfig: IRecurrenceConfig = {
      pattern,
      interval,
      daysOfWeek: pattern === 'weekly' ? daysOfWeek : undefined,
      dayOfMonth: pattern === 'monthly' ? dayOfMonth : undefined,
      endDate: endType === 'date' && endDate ? endDate : undefined,
      maxOccurrences: endType === 'occurrences' && maxOccurrences ? maxOccurrences : undefined,
    };

    onChange(newConfig);
  }, [isEnabled, pattern, interval, daysOfWeek, dayOfMonth, endDate, maxOccurrences, endType, onChange]);

  const handlePatternChange = (newPattern: RecurrencePattern) => {
    setPattern(newPattern);
    
    // Reset pattern-specific fields
    if (newPattern === 'weekly') {
      setDaysOfWeek([new Date().getDay()]); // Default to current day
      setDayOfMonth(1);
    } else if (newPattern === 'monthly') {
      setDaysOfWeek([]);
      setDayOfMonth(new Date().getDate()); // Default to current day of month
    } else {
      setDaysOfWeek([]);
      setDayOfMonth(1);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const getPreviewText = (): string => {
    if (!isEnabled) return t('templates.recurrenceDisabled');

    let text = '';
    
    if (interval === 1) {
      switch (pattern) {
        case 'weekly':
          text = t('templates.everyWeek');
          break;
        case 'bi-weekly':
          text = t('templates.everyTwoWeeks');
          break;
        case 'monthly':
          text = t('templates.everyMonth');
          break;
        case 'quarterly':
          text = t('templates.everyQuarter');
          break;
        default:
          text = t('templates.customPattern');
      }
    } else {
      switch (pattern) {
        case 'weekly':
          text = t('templates.everyNWeeks', { count: interval });
          break;
        case 'bi-weekly':
          text = t('templates.everyNBiWeeks', { count: interval });
          break;
        case 'monthly':
          text = t('templates.everyNMonths', { count: interval });
          break;
        case 'quarterly':
          text = t('templates.everyNQuarters', { count: interval });
          break;
        default:
          text = t('templates.customPattern');
      }
    }

    // Add day information
    if (pattern === 'weekly' && daysOfWeek.length > 0) {
      const dayNames = daysOfWeek.map(day => DAYS_OF_WEEK[day].short).join(', ');
      text += ` ${t('templates.on')} ${dayNames}`;
    } else if (pattern === 'monthly' && dayOfMonth) {
      text += ` ${t('templates.onDay')} ${dayOfMonth}`;
    }

    // Add end information
    if (endType === 'date' && endDate) {
      text += ` ${t('templates.until')} ${format(endDate, 'MMM dd, yyyy')}`;
    } else if (endType === 'occurrences' && maxOccurrences) {
      text += ` ${t('templates.forNOccurrences', { count: maxOccurrences })}`;
    }

    return text;
  };

  const getNextOccurrences = (count: number = 3): Date[] => {
    if (!isEnabled) return [];

    const occurrences: Date[] = [];
    let current = new Date();
    
    // Start from tomorrow for preview
    current = addDays(current, 1);

    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops

    while (occurrences.length < count && attempts < maxAttempts) {
      attempts++;

      let isValidOccurrence = false;

      switch (pattern) {
        case 'weekly':
          if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
            isValidOccurrence = true;
          }
          current = addDays(current, 1);
          break;

        case 'bi-weekly': {
          // For bi-weekly, we need to check if it's the right week
          const weekNumber = Math.floor((current.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weekNumber % (interval * 2) === 0) {
            if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
              isValidOccurrence = true;
            }
          }
          current = addDays(current, 1);
          break;
        }

        case 'monthly':
          if (current.getDate() === dayOfMonth) {
            isValidOccurrence = true;
          }
          current = addDays(current, 1);
          break;

        case 'quarterly': {
          // Check if it's the start of a quarter and the right day
          const month = current.getMonth();
          if ((month % 3 === 0) && current.getDate() === dayOfMonth) {
            isValidOccurrence = true;
          }
          current = addDays(current, 1);
          break;
        }

        default:
          // For custom patterns, just add some sample dates
          isValidOccurrence = true;
          current = addWeeks(current, interval);
          break;
      }

      if (isValidOccurrence) {
        // Check end conditions
        if (endType === 'date' && endDate && current > endDate) {
          break;
        }
        if (endType === 'occurrences' && maxOccurrences && occurrences.length >= maxOccurrences) {
          break;
        }

        occurrences.push(new Date(current));
      }
    }

    return occurrences;
  };

  if (!isEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">{t('templates.recurringConfiguration')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEnabledChange(true)}
          >
            <Repeat className="h-4 w-4 mr-2" />
            {t('templates.enableRecurring')}
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {t('templates.recurringConfigDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{t('templates.recurringConfiguration')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEnabledChange(false)}
        >
          <X className="h-4 w-4 mr-2" />
          {t('templates.disableRecurring')}
        </Button>
      </div>

      {/* Pattern Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pattern">{t('templates.recurrencePattern')}</Label>
          <Select value={pattern} onValueChange={handlePatternChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t('templates.weekly')}</SelectItem>
              <SelectItem value="bi-weekly">{t('templates.biWeekly')}</SelectItem>
              <SelectItem value="monthly">{t('templates.monthly')}</SelectItem>
              <SelectItem value="quarterly">{t('templates.quarterly')}</SelectItem>
              <SelectItem value="custom">{t('templates.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="interval">{t('templates.interval')}</Label>
          <Input
            id="interval"
            type="number"
            min="1"
            max="12"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            placeholder="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('templates.intervalHelp')}
          </p>
        </div>
      </div>

      {/* Pattern-specific configuration */}
      {pattern === 'weekly' && (
        <div>
          <Label className="text-sm font-medium">{t('templates.daysOfWeek')}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDayOfWeek(day.value)}
                className="h-8"
              >
                {day.short}
              </Button>
            ))}
          </div>
          {daysOfWeek.length === 0 && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('templates.selectAtLeastOneDay')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {(pattern === 'monthly' || pattern === 'quarterly') && (
        <div>
          <Label htmlFor="dayOfMonth">{t('templates.dayOfMonth')}</Label>
          <Input
            id="dayOfMonth"
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('templates.dayOfMonthHelp')}
          </p>
        </div>
      )}

      {/* End Configuration */}
      <div>
        <Label className="text-sm font-medium">{t('templates.recurrenceEnd')}</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="never"
              name="endType"
              checked={endType === 'never'}
              onChange={() => setEndType('never')}
              className="h-4 w-4"
            />
            <Label htmlFor="never" className="text-sm">
              {t('templates.neverEnd')}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="endDate"
              name="endType"
              checked={endType === 'date'}
              onChange={() => setEndType('date')}
              className="h-4 w-4"
            />
            <Label htmlFor="endDate" className="text-sm">
              {t('templates.endByDate')}
            </Label>
            {endType === 'date' && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : t('templates.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => {
                      setEndDate(date || null);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="occurrences"
              name="endType"
              checked={endType === 'occurrences'}
              onChange={() => setEndType('occurrences')}
              className="h-4 w-4"
            />
            <Label htmlFor="occurrences" className="text-sm">
              {t('templates.endAfterOccurrences')}
            </Label>
            {endType === 'occurrences' && (
              <Input
                type="number"
                min="1"
                max="365"
                value={maxOccurrences || ''}
                onChange={(e) => setMaxOccurrences(parseInt(e.target.value) || null)}
                className="w-20 h-8"
                placeholder="10"
              />
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-600" />
          <Label className="text-sm font-medium">{t('templates.recurrencePreview')}</Label>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">
          {getPreviewText()}
        </p>

        {/* Next occurrences */}
        <div>
          <Label className="text-xs text-gray-600">{t('templates.nextOccurrences')}:</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {getNextOccurrences(5).map((date, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {format(date, 'MMM dd')}
              </Badge>
            ))}
            {getNextOccurrences(1).length === 0 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                {t('templates.noValidOccurrences')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 