
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Building2,
  Repeat,
  Edit3,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function TaskCard({
  task,
  client,
  onUpdate,
  onClick,
  onDelete,
  showClient = false,
  isOverdue = false,
  isCompleted = false,
  users = [] // Add users prop
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#E2445C';
      case 'high': return '#FDAB3D';
      case 'medium': return '#FFCB00';
      case 'low': return '#787D80';
      default: return '#C4C4C4';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done':
      case 'Completed':
        return '#00C875';
      case 'In Progress':
        return '#FFCB00';
      case 'Blocked':
        return '#E2445C';
      default:
        return '#C4C4C4';
    }
  };

  // Helper function to safely get assignee display name
  const getAssigneeDisplay = (assigneeData) => {
    if (!assigneeData) return null;
    
    // Handle different assignee data formats
    if (typeof assigneeData === 'string') {
      // If it's a string, try to split by @ to get name part
      if (assigneeData.includes('@')) {
        return assigneeData.split('@')[0];
      }
      return assigneeData;
    }
    
    // If it's an array, take the first assignee
    if (Array.isArray(assigneeData) && assigneeData.length > 0) {
      const firstAssignee = assigneeData[0];
      if (typeof firstAssignee === 'string' && firstAssignee.includes('@')) {
        return firstAssignee.split('@')[0];
      }
      return firstAssignee;
    }
    
    return null;
  };

  // Helper function to get assignee user object
  const getAssigneeUser = (assigneeData) => {
    if (!assigneeData || !users.length) return null;
    
    let assigneeEmail = '';
    if (typeof assigneeData === 'string') {
      assigneeEmail = assigneeData;
    } else if (Array.isArray(assigneeData) && assigneeData.length > 0) {
      assigneeEmail = assigneeData[0];
    }
    
    return users.find(user => user.email === assigneeEmail);
  };

  const assigneeDisplay = getAssigneeDisplay(task.data?.assignee);
  const assigneeUser = getAssigneeUser(task.data?.assignee);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
        onDelete(task.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={`cursor-pointer transition-all duration-200 border-l-4 ${
          isOverdue
            ? 'bg-red-100/50 border-l-red-500 hover:bg-red-100/70'
            : isCompleted
            ? 'bg-green-100/50 border-l-green-500 hover:bg-green-100/70 opacity-80'
            : 'bg-white border-l-blue-500 hover:bg-gray-50'
        } border-gray-200 hover:border-gray-300 shadow-sm`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Task Title */}
            <div className="flex items-start justify-between">
              <h4 className={`font-medium text-sm leading-tight ${
                isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'
              }`}>
                {task.title}
              </h4>
              {(isHovered || task.recurrence !== 'none') && (
                <div className="flex items-center">
                  {task.recurrence !== 'none' && <Repeat className="w-3 h-3 text-gray-500 mr-1" title={`Recurring ${task.recurrence}`} />}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-gray-800"
                        onClick={(e) => e.stopPropagation()} // Stop propagation to prevent card click
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}> {/* Stop propagation for content to prevent card click */}
                      <DropdownMenuItem onClick={onClick}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-white focus:bg-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Client Info (if showClient is true) */}
            {showClient && client && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">{client.name}</span>
              </div>
            )}

            {/* Tags/Status */}
            <div className="flex flex-wrap gap-1">
              {task.data?.status && (
                <Badge
                  className="text-xs px-2 py-0.5 rounded-full text-white border-0"
                  style={{ backgroundColor: getStatusColor(task.data.status) }}
                >
                  {task.data.status}
                </Badge>
              )}

              {task.data?.priority && (
                <Badge
                  className="text-xs px-2 py-0.5 rounded-full text-white border-0"
                  style={{ backgroundColor: getPriorityColor(task.data.priority) }}
                >
                  {task.data.priority}
                </Badge>
              )}

              {isOverdue && (
                <Badge className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
                  Overdue
                </Badge>
              )}
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              {/* Due Date */}
              {task.data?.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                    {format(parseISO(task.data.due_date), 'MMM d')}
                  </span>
                </div>
              )}

              {/* Assignee with Profile Picture */}
              {assigneeDisplay && (
                <div className="flex items-center gap-1">
                  {assigneeUser ? (
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={assigneeUser.avatar_url} alt={assigneeUser.full_name} />
                      <AvatarFallback className="text-[8px]">
                        {assigneeUser.full_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span>{assigneeDisplay}</span>
                </div>
              )}

              {/* Time indicator for overdue */}
              {isOverdue && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}

              {/* Completion indicator */}
              {isCompleted && (
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
