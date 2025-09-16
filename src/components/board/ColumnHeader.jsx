import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  MoreHorizontal,
  SortAsc,
  SortDesc,
  Filter,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Plus,
  Type,
  Calendar,
  User,
  Hash,
  DollarSign,
  CheckSquare,
  Tag,
  AlertTriangle
} from "lucide-react";

const columnTypeIcons = {
  text: Type,
  status: Tag,
  date: Calendar,
  people: User,
  number: Hash,
  budget: DollarSign,
  checkbox: CheckSquare,
  dropdown: ChevronDown,
  priority: AlertTriangle
};

export default function ColumnHeader({ 
  column, 
  onUpdateColumn, 
  onDeleteColumn, 
  style = {}, 
  groupId 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [sortDirection, setSortDirection] = useState(null);

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(column.title);
      setIsEditing(false);
    }
  };

  const handleSort = (direction) => {
    setSortDirection(direction);
    // TODO: Implement sorting logic
    console.log(`Sort ${column.id} ${direction}`);
  };

  const handleHideColumn = () => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id);
    }
  };

  const IconComponent = columnTypeIcons[column.type] || Type;

  return (
    <div
      className="flex items-center justify-between px-3 py-3 border-l border-[#E1E5F3] text-sm font-medium text-[#676879] bg-[#F5F6F8] hover:bg-white transition-colors group"
      style={{
        width: column.width || 150,
        minWidth: column.width || 150,
        ...style
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyPress}
            className="h-6 px-1 text-sm font-medium border-none bg-transparent focus:ring-1 focus:ring-[#0073EA]"
            autoFocus
          />
        ) : (
          <span 
            className="truncate cursor-pointer hover:text-[#323338] transition-colors"
            onClick={() => setIsEditing(true)}
            title={column.title}
          >
            {column.title}
          </span>
        )}

        {sortDirection && (
          <Badge variant="outline" className="h-4 px-1 text-xs">
            {sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E1E5F3]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Rename Column
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleSort('asc')}>
            <SortAsc className="w-4 h-4 mr-2" />
            Sort A → Z
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleSort('desc')}>
            <SortDesc className="w-4 h-4 mr-2" />
            Sort Z → A
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <Filter className="w-4 h-4 mr-2" />
            Filter Column
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Settings className="w-4 h-4 mr-2" />
            Column Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Only show hide option if this is called from a group context */}
          {groupId && (
            <DropdownMenuItem onClick={handleHideColumn} className="text-orange-600">
              <EyeOff className="w-4 h-4 mr-2" />
              Hide from Group
            </DropdownMenuItem>
          )}
          
          {/* Only show delete option for non-essential columns */}
          {column.id !== 'task' && !groupId && (
            <DropdownMenuItem 
              onClick={() => onDeleteColumn && onDeleteColumn(column.id)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}