import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, isAfter, isBefore, isToday, addDays } from "date-fns";

export default function DateCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? new Date(value) : null;
  const today = new Date();

  const handleDateSelect = (date) => {
    if (date) {
      onChange(date.toISOString().split('T')[0]);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const getDateStatus = () => {
    if (!selectedDate) return null;
    
    if (isToday(selectedDate)) return 'today';
    if (isBefore(selectedDate, today)) return 'overdue';
    if (isBefore(selectedDate, addDays(today, 3))) return 'upcoming';
    return 'future';
  };

  const getDateColor = () => {
    const status = getDateStatus();
    switch (status) {
      case 'today': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
      case 'upcoming': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="px-3 py-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-7 px-3 justify-start text-left font-normal border w-full max-w-[120px] ${
              selectedDate ? getDateColor() : 'text-[#676879] border-transparent hover:border-gray-200'
            }`}
          >
            <CalendarIcon className="w-3 h-3 mr-2 flex-shrink-0" />
            <span className="truncate">
              {selectedDate ? format(selectedDate, 'MMM d') : 'Set date'}
            </span>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-auto hover:bg-white/50"
                onClick={handleClear}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-md border"
          />
          <div className="p-3 border-t">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="h-7 text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(addDays(new Date(), 1))}
                className="h-7 text-xs"
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(addDays(new Date(), 7))}
                className="h-7 text-xs"
              >
                Next week
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}