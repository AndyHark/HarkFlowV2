import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";

export default function BudgetCell({ value, onChange, column }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  const handleSave = () => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = editValue.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(cleanValue);
    
    if (!isNaN(numValue)) {
      onChange(numValue);
    } else if (editValue === '') {
      onChange(null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Allow numbers, decimal points, and dollar signs
    if (val === '' || /^[\$]?\d*\.?\d*$/.test(val)) {
      setEditValue(val);
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '';
    
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const getBudgetStatus = () => {
    if (!value) return null;
    
    const amount = parseFloat(value);
    if (amount >= 10000) return 'high';
    if (amount >= 1000) return 'medium';
    return 'low';
  };

  const getBudgetColor = () => {
    const status = getBudgetStatus();
    switch (status) {
      case 'high': return 'text-green-700 bg-green-50';
      case 'medium': return 'text-blue-700 bg-blue-50';
      case 'low': return 'text-gray-700 bg-gray-50';
      default: return 'text-gray-600';
    }
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2">
        <div className="relative">
          <DollarSign className="w-3 h-3 absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            ref={inputRef}
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 border-none bg-transparent pl-4 pr-0 focus:ring-1 focus:ring-[#0073EA] text-sm text-right"
            placeholder="0.00"
            type="text"
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded group text-right"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center justify-end">
        {value !== null && value !== undefined ? (
          <span className={`text-sm font-medium px-2 py-1 rounded ${getBudgetColor()}`}>
            {formatCurrency(value)}
          </span>
        ) : (
          <span className="text-[#676879] italic group-hover:text-[#323338] transition-colors text-sm flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Enter amount
          </span>
        )}
      </div>
    </div>
  );
}