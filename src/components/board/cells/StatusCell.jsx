import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Circle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const statusOptions = [
  { 
    label: 'Not Started', 
    color: '#C4C4C4', 
    icon: Circle,
    textColor: '#666666'
  },
  { 
    label: 'Working on it', 
    color: '#FFCB00', 
    icon: Clock,
    textColor: '#B8860B'
  },
  { 
    label: 'Done', 
    color: '#00C875', 
    icon: CheckCircle2,
    textColor: '#006B3A'
  },
  { 
    label: 'Stuck', 
    color: '#E2445C', 
    icon: AlertTriangle,
    textColor: '#B91C1C'
  }
];

export default function StatusCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get current status or default
  const currentStatus = statusOptions.find(s => s.label === value) || statusOptions[0];
  const IconComponent = currentStatus.icon;

  const handleStatusChange = (newStatus) => {
    onChange(newStatus.label);
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
                backgroundColor: currentStatus.color,
                color: currentStatus.textColor
              }}
            >
              <IconComponent className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{currentStatus.label}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" />
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {statusOptions.map((status) => {
            const StatusIcon = status.icon;
            return (
              <DropdownMenuItem
                key={status.label}
                onClick={() => handleStatusChange(status)}
                className="flex items-center gap-3 py-2"
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: status.color }}
                >
                  <StatusIcon className="w-3 h-3 text-white" />
                </div>
                <span className="font-medium">{status.label}</span>
                {value === status.label && (
                  <CheckCircle2 className="w-4 h-4 ml-auto text-green-600" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}