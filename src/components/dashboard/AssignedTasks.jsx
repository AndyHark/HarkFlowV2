
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Calendar,
  User,
  Building2,
  ArrowRight,
  Filter,
  Play
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Item } from "@/api/entities";
import TaskDetailModal from "../tasks/TaskDetailModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AssignedTasks({ tasks, boards, clients, onMarkComplete, isLoading, currentTimer, onStartTimer, onUpdateTask, users = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const getClientForTask = (task) => {
    const board = boards.find(b => b.id === task.board_id);
    if (board) {
      return clients.find(c => c.board_id === board.id);
    }
    return null;
  };

  const getBoardForTask = (task) => {
    return boards.find(b => b.id === task.board_id);
  };

  const getTaskPriority = (task) => {
    return task.data?.priority || task.priority || 'medium';
  };

  const getTaskStatus = (task) => {
    return task.data?.status || 'Not Started';
  };

  const getTaskDueDate = (task) => {
    return task.data?.due_date || task.data?.deadline;
  };

  const isCompleted = (task) => {
    const status = getTaskStatus(task);
    const lowerCaseStatus = status?.toLowerCase();
    return lowerCaseStatus === 'done' ||
           lowerCaseStatus === 'completed' ||
           lowerCaseStatus === 'complete' ||
           (task.data?.date_completed && task.data.date_completed.trim() !== '');
  };

  const isOverdue = (task) => {
    const dueDate = getTaskDueDate(task);
    if (!dueDate || isCompleted(task)) return false;
    return isBefore(parseISO(dueDate), new Date());
  };

  const isDueToday = (task) => {
    const dueDate = getTaskDueDate(task);
    if (!dueDate) return false;
    const today = new Date();
    const taskDate = parseISO(dueDate);
    return taskDate.toDateString() === today.toDateString();
  };

  const getPriorityOrder = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 5;
    }
  };

  // Helper to get display string for assignee (typically an email)
  const getAssigneeDisplay = (assigneeData) => {
    if (!assigneeData) return null;
    if (typeof assigneeData === 'string') {
      return assigneeData; // It's an email string
    } else if (Array.isArray(assigneeData) && assigneeData.length > 0) {
      return assigneeData[0]; // Take the first assignee if it's an array of emails
    }
    return null;
  };

  const filteredTasks = tasks
    .filter(task => {
      // Filter out completed tasks
      if (isCompleted(task)) return false;

      // Search filter
      const matchesSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        statusFilter === 'pending' || // If 'pending' is selected, all non-completed (already filtered) tasks are shown.
        (statusFilter === 'overdue' && isOverdue(task));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aDueDate = getTaskDueDate(a);
      const bDueDate = getTaskDueDate(b);
      const aPriority = getTaskPriority(a);
      const bPriority = getTaskPriority(b);

      // First, sort by due date (soonest first)
      // Tasks with due dates come before tasks without due dates.
      // Then, by actual date.
      if (aDueDate && bDueDate) {
        const dateComparison = parseISO(aDueDate).getTime() - parseISO(bDueDate).getTime();
        if (dateComparison !== 0) return dateComparison;
      } else if (aDueDate && !bDueDate) {
        return -1; // Task A has due date, Task B doesn't. A comes first.
      } else if (!aDueDate && bDueDate) {
        return 1; // Task B has due date, Task A doesn't. B comes first.
      }

      // Then sort by priority (critical, high, medium, low)
      return getPriorityOrder(aPriority) - getPriorityOrder(bPriority);
    });

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done':
      case 'Completed':
      case 'Complete':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
      case 'Working':
        return 'bg-blue-100 text-blue-800';
      case 'Blocked':
      case 'Stuck':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await Item.update(taskId, updates);
      if (onUpdateTask) {
        onUpdateTask(taskId, updates);
      }
      setShowTaskModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              My Assigned Tasks
            </CardTitle>
            <Badge variant="outline">
              {filteredTasks.length} active
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md h-9"
            >
              <option value="all">All Active</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {searchQuery ? 'No matching tasks' : 'No active tasks'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchQuery ? 'Try adjusting your search' : 'All your tasks are completed!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTasks.map((task, index) => {
                  const client = getClientForTask(task);
                  const board = getBoardForTask(task);
                  const priority = getTaskPriority(task);
                  const status = getTaskStatus(task);
                  const dueDate = getTaskDueDate(task);
                  const overdue = isOverdue(task);
                  const dueToday = isDueToday(task);

                  const assigneeDisplay = getAssigneeDisplay(task.data?.assignee);

                  // Get assignee user for profile picture
                  const getAssigneeUser = (assigneeData) => {
                    if (!assigneeData || !users.length) return null;

                    let assigneeEmail = '';
                    if (typeof assigneeData === 'string') {
                      assigneeEmail = assigneeData;
                    } else if (Array.isArray(assigneeData) && assigneeData.length > 0) {
                      assigneeEmail = assigneeData[0];
                    }
                    if (!assigneeEmail) return null;

                    return users.find(user => user.email?.toLowerCase() === assigneeEmail?.toLowerCase());
                  };

                  const assigneeUser = getAssigneeUser(task.data?.assignee);

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onMarkComplete(task.id)}
                          className="mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors border-gray-300 hover:border-green-500"
                          title="Mark as complete"
                        >
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors text-gray-900"
                              onClick={() => handleTaskClick(task)}
                            >
                              {task.title}
                            </h4>
                            {overdue && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            {client && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                <span>{client.name}</span>
                              </div>
                            )}
                            {(board && client) && <span>•</span>}
                            {board && (
                              <span>{board.title}</span>
                            )}
                            {/* Always show assignee information regardless of user role */}
                            {assigneeDisplay && (
                              <>
                                {(client || board) && <span>•</span>}
                                <div className="flex items-center gap-1">
                                  {assigneeUser ? (
                                    <Avatar className="w-4 h-4">
                                      <AvatarImage src={assigneeUser.avatar_url} alt={assigneeUser.full_name || assigneeUser.email} />
                                      <AvatarFallback className="text-[8px] leading-none">
                                        {assigneeUser.full_name?.[0]?.toUpperCase() || assigneeUser.email?.[0]?.toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <User className="w-3 h-3" />
                                  )}
                                  <span>{assigneeUser?.full_name || assigneeDisplay}</span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(status)} variant="outline">
                              {status}
                            </Badge>
                            <Badge className={getPriorityColor(priority)} variant="outline">
                              {priority}
                            </Badge>
                            {dueDate && (
                              <Badge
                                variant="outline"
                                className={`flex items-center gap-1 ${
                                  overdue ? 'bg-red-50 text-red-700 border-red-200' :
                                  dueToday ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(dueDate), 'MMM d')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!currentTimer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:bg-green-100"
                              onClick={() => onStartTimer(task)}
                              title="Start timer for this task"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleTaskClick(task)}
                            title="View task details"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          board={getBoardForTask(selectedTask)}
          onUpdate={handleTaskUpdate}
          onDelete={async (taskId) => {
            try {
              await Item.delete(taskId);
              if (onUpdateTask) {
                onUpdateTask(taskId, null); // Signal deletion
              }
              setShowTaskModal(false);
              setSelectedTask(null);
            } catch (error) {
              console.error('Failed to delete task:', error);
            }
          }}
        />
      )}
    </>
  );
}
