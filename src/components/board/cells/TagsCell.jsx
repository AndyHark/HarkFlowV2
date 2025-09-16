import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Tag } from "lucide-react";

export default function TagsCell({ value, onChange, column }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  // Ensure value is always an array
  const tags = Array.isArray(value) ? value : (value ? [value] : []);
  
  // Predefined tag colors
  const tagColors = [
    '#0073EA', '#00C875', '#FFCB00', '#E2445C', '#A25DDC', 
    '#00D9FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ];
  
  const getTagColor = (tag) => {
    const index = tag.charCodeAt(0) % tagColors.length;
    return tagColors[index];
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      onChange(updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    onChange(updatedTags);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="px-3 py-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer min-h-[28px] flex items-center">
            {tags.length === 0 ? (
              <div className="flex items-center gap-2 text-[#676879] hover:text-[#323338] transition-colors">
                <Tag className="w-3 h-3" />
                <span className="text-sm">Add tags</span>
              </div>
            ) : (
              <div className="flex gap-1 flex-wrap">
                {tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-0 gap-1"
                    style={{
                      backgroundColor: getTagColor(tag) + '20',
                      color: getTagColor(tag)
                    }}
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-white/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                    >
                      <X className="w-2 h-2" />
                    </Button>
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm mb-2">Manage Tags</h4>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add new tag..."
                className="h-7 text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="h-7 px-2"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {tags.length > 0 && (
            <div className="p-3">
              <div className="flex gap-1 flex-wrap">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-1 border-0 gap-1"
                    style={{
                      backgroundColor: getTagColor(tag) + '20',
                      color: getTagColor(tag)
                    }}
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-white/50"
                      onClick={() => handleRemoveTag(tag)}
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