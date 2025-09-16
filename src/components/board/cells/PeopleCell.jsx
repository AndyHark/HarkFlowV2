import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, Users, X, Plus } from "lucide-react";

// Mock users - in a real app, this would come from a user management system
const availableUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', avatar: 'JD' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'JS' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'MJ' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: 'SW' },
  { id: '5', name: 'David Brown', email: 'david@example.com', avatar: 'DB' },
];

export default function PeopleCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Handle both single person (string) and multiple people (array)
  const selectedPeople = Array.isArray(value) ? value : (value ? [value] : []);
  const selectedUsers = selectedPeople.map(personId => 
    availableUsers.find(user => user.id === personId || user.email === personId)
  ).filter(Boolean);

  const handlePersonToggle = (user) => {
    const isSelected = selectedPeople.includes(user.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedPeople.filter(id => id !== user.id);
    } else {
      newSelection = [...selectedPeople, user.id];
    }
    
    // If column supports multiple people, return array, otherwise return single value
    const supportsMultiple = column?.options?.multiple !== false;
    onChange(supportsMultiple ? newSelection : (newSelection[0] || null));
  };

  const handleRemovePerson = (userId, e) => {
    e.stopPropagation();
    const newSelection = selectedPeople.filter(id => id !== userId);
    const supportsMultiple = column?.options?.multiple !== false;
    onChange(supportsMultiple ? newSelection : null);
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="px-3 py-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-7 px-2 justify-start text-left font-normal border-transparent hover:border-gray-200 w-full"
          >
            {selectedUsers.length === 0 ? (
              <>
                <User className="w-3 h-3 mr-2 text-gray-400" />
                <span className="text-[#676879] text-sm">Assign</span>
              </>
            ) : selectedUsers.length === 1 ? (
              <>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs mr-2 ${getAvatarColor(selectedUsers[0].name)}`}>
                  {selectedUsers[0].avatar || getInitials(selectedUsers[0].name)}
                </div>
                <span className="text-sm truncate">{selectedUsers[0].name}</span>
              </>
            ) : (
              <>
                <div className="flex -space-x-1 mr-2">
                  {selectedUsers.slice(0, 2).map((user) => (
                    <div 
                      key={user.id}
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs border border-white ${getAvatarColor(user.name)}`}
                    >
                      {user.avatar || getInitials(user.name)}
                    </div>
                  ))}
                  {selectedUsers.length > 2 && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-gray-400 text-white text-xs border border-white">
                      +{selectedUsers.length - 2}
                    </div>
                  )}
                </div>
                <span className="text-sm">{selectedUsers.length} people</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Assign People</h4>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {availableUsers.map((user) => {
              const isSelected = selectedPeople.includes(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePersonToggle(user)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${getAvatarColor(user.name)}`}>
                    {user.avatar || getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedUsers.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <div className="flex gap-1 flex-wrap">
                {selectedUsers.map((user) => (
                  <Badge 
                    key={user.id} 
                    variant="secondary" 
                    className="text-xs py-0.5 pl-1 pr-1 gap-1"
                  >
                    <div className={`w-3 h-3 rounded-full ${getAvatarColor(user.name)}`} />
                    {user.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-gray-300"
                      onClick={(e) => handleRemovePerson(user.id, e)}
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}