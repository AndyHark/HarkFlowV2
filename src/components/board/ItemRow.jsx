import React, { useState, forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  GripVertical, 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit3,
  Link as LinkIcon,
  Calendar,
  User,
  Flag
} from "lucide-react";
import { motion } from "framer-motion";

import TextCell from "./cells/TextCell";
import StatusCell from "./cells/StatusCell";
import DateCell from "./cells/DateCell";
import PeopleCell from "./cells/PeopleCell";
import NumberCell from "./cells/NumberCell";
import BudgetCell from "./cells/BudgetCell";
import CheckboxCell from "./cells/CheckboxCell";
import DropdownCell from "./cells/DropdownCell";
import PriorityCell from "./cells/PriorityCell";
import TagsCell from "./cells/TagsCell";

const ItemRow = forwardRef(({ 
  item, 
  columns, 
  onUpdate, 
  onDelete, 
  index,
  selectedItems,
  onSelectItem,
  ...dragProps
}, ref) => {
  const [showActions, setShowActions] = useState(false);
  const isSelected = selectedItems?.has(item.id) || false;

  const handleCellUpdate = (columnId, value) => {
    const updatedData = { ...item.data, [columnId]: value };
    onUpdate(item.id, { data: updatedData });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(item.id);
    }
  };

  const handleDuplicate = () => {
    // TODO: Implement duplication logic
    console.log('Duplicate item:', item.id);
  };

  const handleSelectChange = (checked) => {
    if (onSelectItem) {
      onSelectItem(item.id, checked);
    }
  };

  const renderCell = (column) => {
    const value = column.id === 'task' ? item.title : item.data?.[column.id];
    
    const cellProps = {
      value,
      onChange: (newValue) => {
        if (column.id === 'task') {
          onUpdate(item.id, { title: newValue });
        } else {
          handleCellUpdate(column.id, newValue);
        }
      },
      column,
      item
    };

    switch (column.type) {
      case 'text':
        return <TextCell {...cellProps} />;
      case 'status':
        return <StatusCell {...cellProps} />;
      case 'date':
        return <DateCell {...cellProps} />;
      case 'people':
        return <PeopleCell {...cellProps} />;
      case 'number':
        return <NumberCell {...cellProps} />;
      case 'budget':
        return <BudgetCell {...cellProps} />;
      case 'checkbox':
        return <CheckboxCell {...cellProps} />;
      case 'dropdown':
        return <DropdownCell {...cellProps} />;
      case 'priority':
        return <PriorityCell {...cellProps} />;
      case 'tags':
        return <TagsCell {...cellProps} />;
      default:
        return (
          <div className="px-3 py-2 text-sm text-[#676879]">
            {value || '—'}
          </div>
        );
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <tr
      ref={ref}
      {...dragProps}
      className={`border-b border-[#E1E5F3] hover:bg-[#F5F6F8] group transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Selection Checkbox */}
      <td className="p-2 w-6 sticky left-0 bg-inherit z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectChange}
          className="data-[state=checked]:bg-[#0073EA] data-[state=checked]:border-[#0073EA]"
        />
      </td>

      {/* Drag Handle */}
      <td className="p-2 w-8 sticky left-6 bg-inherit z-10">
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing">
          <GripVertical className={`w-4 h-4 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} text-[#676879]`} />
          
          {/* Priority indicator */}
          {item.data?.priority && (
            <div 
              className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(item.data.priority)}`}
            />
          )}
        </div>
      </td>

      {/* Dynamic Columns */}
      {columns.map((column) => (
        <td
          key={column.id}
          className={`border-l border-[#E1E5F3] ${
            column.id === 'task' ? 'sticky left-14 bg-inherit z-10' : ''
          }`}
          style={{ 
            width: column.width || 150, 
            minWidth: column.width || 150 
          }}
        >
          {renderCell(column)}
        </td>
      ))}

      {/* Actions */}
      <td className="p-2 w-12 text-center sticky right-0 bg-inherit z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} hover:bg-[#E1E5F3]`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

ItemRow.displayName = 'ItemRow';

export default ItemRow;