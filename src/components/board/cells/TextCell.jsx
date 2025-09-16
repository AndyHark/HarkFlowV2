import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";

export default function TextCell({ value, onChange, column }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onChange(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 border-none bg-transparent p-0 focus:ring-1 focus:ring-[#0073EA] text-sm"
          placeholder={`Enter ${column?.title?.toLowerCase() || 'text'}...`}
        />
      </div>
    );
  }

  return (
    <div 
      className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded group"
      onClick={() => setIsEditing(true)}
    >
      <div className="text-sm text-[#323338] truncate font-medium">
        {value || (
          <span className="text-[#676879] italic group-hover:text-[#323338] transition-colors">
            Enter {column?.title?.toLowerCase() || 'text'}...
          </span>
        )}
      </div>
    </div>
  );
}