import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle } from "lucide-react";

export default function CheckboxCell({ value, onChange, column }) {
  const isChecked = Boolean(value);

  const handleChange = (checked) => {
    onChange(checked);
  };

  return (
    <div className="px-3 py-2 flex items-center justify-center">
      <div className="relative">
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleChange}
          className="data-[state=checked]:bg-[#00C875] data-[state=checked]:border-[#00C875] border-2 w-5 h-5"
        />
        {isChecked && (
          <CheckCircle2 className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>
    </div>
  );
}