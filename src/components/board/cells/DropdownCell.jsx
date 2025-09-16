import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Circle, CheckCircle2 } from "lucide-react";

export default function DropdownCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get options from column configuration
  const options = column?.options?.choices || [
    { value: 'option1', label: 'Option 1', color: '#0073EA' },
    { value: 'option2', label: 'Option 2', color: '#00C875' },
    { value: 'option3', label: 'Option 3', color: '#FFCB00' }
  ];
  
  // Find current selection
  const currentOption = options.find(opt => opt.value === value);

  const handleOptionChange = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const getOptionColor = (option) => {
    return option.color || '#0073EA';
  };

  return (
    <div className="px-3 py-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">
            {currentOption ? (
              <Badge 
                variant="outline"
                className="border-0 hover:shadow-md transition-all duration-200 font-medium px-3 py-1.5 h-7 gap-2 max-w-full"
                style={{ 
                  backgroundColor: getOptionColor(currentOption) + '20',
                  color: getOptionColor(currentOption),
                  border: `1px solid ${getOptionColor(currentOption)}40`
                }}
              >
                <Circle 
                  className="w-3 h-3 flex-shrink-0" 
                  style={{ fill: getOptionColor(currentOption) }}
                />
                <span className="truncate">{currentOption.label}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
              </Badge>
            ) : (
              <Badge 
                variant="outline"
                className="border-dashed border-gray-300 text-[#676879] hover:border-gray-400 transition-all duration-200 px-3 py-1.5 h-7 gap-2"
              >
                <Circle className="w-3 h-3 flex-shrink-0" />
                <span>Select option</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleOptionChange(option)}
              className="flex items-center gap-3 py-2"
            >
              <Circle 
                className="w-4 h-4 flex-shrink-0"
                style={{ 
                  fill: getOptionColor(option),
                  color: getOptionColor(option)
                }}
              />
              <span className="font-medium flex-1">{option.label}</span>
              {value === option.value && (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}