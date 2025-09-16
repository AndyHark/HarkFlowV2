import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Hash } from "lucide-react";

export default function NumberCell({ value, onChange, column }) {
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
    const numValue = parseFloat(editValue);
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
    // Allow numbers, decimal points, and negative signs
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      setEditValue(val);
    }
  };

  const formatDisplayValue = (val) => {
    if (val === null || val === undefined) return '';
    
    // Format numbers with commas for large numbers
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    
    if (column?.options?.format === 'percentage') {
      return `${num}%`;
    }
    
    if (Math.abs(num) >= 1000) {
      return num.toLocaleString();
    }
    
    return num.toString();
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={handleInputChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 border-none bg-transparent p-0 focus:ring-1 focus:ring-[#0073EA] text-sm text-right"
          placeholder="0"
          type="text"
        />
      </div>
    );
  }

  return (
    <div 
      className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded group text-right"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center justify-end gap-2">
        {value !== null && value !== undefined ? (
          <span className="text-sm text-[#323338] font-medium">
            {formatDisplayValue(value)}
          </span>
        ) : (
          <span className="text-[#676879] italic group-hover:text-[#323338] transition-colors text-sm flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Enter number
          </span>
        )}
      </div>
    </div>
  );
}