import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Flag, AlertTriangle, Minus, ArrowUp, ArrowDown } from "lucide-react";

const priorityOptions = [
  { 
    value: 'Critical', 
    label: 'Critical', 
    color: '#E2445C', 
    icon: AlertTriangle,
    bgColor: '#FEF2F2',
    textColor: '#B91C1C'
  },
  { 
    value: 'High', 
    label: 'High', 
    color: '#FDAB3D', 
    icon: ArrowUp,
    bgColor: '#FFFBEB',
    textColor: '#D97706'
  },
  { 
    value: 'Medium', 
    label: 'Medium', 
    color: '#FFCB00', 
    icon: Minus,
    bgColor: '#FEFCE8',
    textColor: '#CA8A04'
  },
  { 
    value: 'Low', 
    label: 'Low', 
    color: '#787D80', 
    icon: ArrowDown,
    bgColor: '#F8FAFC',
    textColor: '#64748B'
  }
];

export default function PriorityCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get current priority or default to Medium
  const currentPriority = priorityOptions.find(p => p.value === value) || priorityOptions[2];
  const IconComponent = currentPriority.icon;

  const handlePriorityChange = (newPriority) => {
    onChange(newPriority.value);
    setIsOpen(false);
  };

  return (
    <div className="px-3 py-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">
            <Badge 
              variant="outline"
              className="border-0 hover:shadow-md transition-all duration-200 font-medium px-3 py-1.5 h-7 gap-2 max-w-full"
              style={{ 
                backgroundColor: currentPriority.bgColor,
                color: currentPriority.textColor,
                border: `1px solid ${currentPriority.color}20`
              }}
            >
              <IconComponent className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{currentPriority.label}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {priorityOptions.map((priority) => {
            const PriorityIcon = priority.icon;
            return (
              <DropdownMenuItem
                key={priority.value}
                onClick={() => handlePriorityChange(priority)}
                className="flex items-center gap-3 py-2"
              >
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center border"
                  style={{ 
                    backgroundColor: priority.bgColor,
                    borderColor: priority.color + '40'
                  }}
                >
                  <PriorityIcon 
                    className="w-3 h-3" 
                    style={{ color: priority.color }}
                  />
                </div>
                <span className="font-medium text-sm">{priority.label}</span>
                {value === priority.value && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}