
import React, { useState, useEffect, useCallback } from "react";
import { Client } from "@/api/entities";
import { Board } from "@/api/entities";
import { Item } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  Briefcase,
  Clock,
  AlertTriangle,
  Circle,
  PackageOpen
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import TaskFilters from "../components/tasks/TaskFilters";
import NewTaskModal from "../components/tasks/NewTaskModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ClientTasksPage() {
  const [clients, setClients] = useState([]);
  const [boards, setBoards] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false); // Renamed from showTaskDetailModal
  const [selectedClientForNewTask, setSelectedClientForNewTask] = useState(null);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    statuses: [],
    priorities: [],
    dueDates: [],
    completions: []
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('ClientTasks: Starting data load...');
      
      // Load user first
      let currentUser = null;
      try {
        currentUser = await User.me();
        console.log('ClientTasks: User loaded:', currentUser);
        setUser(currentUser);
      } catch (error) {
        console.error('ClientTasks: Failed to load current user:', error);
        setUser(null); // Ensure user is null if fetch fails
      }

      // Load clients
      let clientsData = [];
      try {
        clientsData = await Client.list('-updated_date');
        console.log('ClientTasks: Clients loaded successfully:', clientsData.length, 'clients');
        setClients(clientsData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('ClientTasks: Failed to load clients:', error);
        setClients([]);
      }

      // Load boards
      let boardsData = [];
      try {
        boardsData = await Board.list('-updated_date');
        console.log('ClientTasks: Boards loaded successfully:', boardsData.length, 'boards');
        setBoards(boardsData);
      } catch (error) {
        console.error('ClientTasks: Failed to load boards:', error);
        setBoards([]);
      }

      // Load users
      try {
        const allUsersData = await User.list();
        console.log('ClientTasks: Users loaded successfully:', allUsersData.length, 'users');
        setUsers(allUsersData);
      } catch (error) {
        console.error('ClientTasks: Failed to load users:', error);
        setUsers([]);
      }

      // Load tasks
      if (clientsData.length > 0) {
        const boardIds = clientsData.map(client => client.board_id).filter(Boolean);
        console.log('ClientTasks: Board IDs from clients:', boardIds);
        
        if (boardIds.length > 0) {
          try {
            const tasksData = await Item.list('-updated_date');
            console.log('ClientTasks: All items loaded successfully:', tasksData.length, 'items');
            
            // Filter tasks to only include those from client boards
            const clientTasks = tasksData.filter(task => boardIds.includes(task.board_id));
            console.log('ClientTasks: Client tasks filtered:', clientTasks.length, 'tasks');
            
            setAllTasks(clientTasks);
          } catch (error) {
            console.error('ClientTasks: Failed to load items:', error);
            setAllTasks([]);
          }
        } else {
          console.log('ClientTasks: No board IDs found, setting empty tasks');
          setAllTasks([]);
        }
      } else {
        console.log('ClientTasks: No clients found, setting empty tasks');
        setAllTasks([]);
      }

    } catch (error) {
      console.error("ClientTasks: Error during overall data loading process:", error);
      // Set fallback empty states for any uncaught errors
      setClients([]);
      setBoards([]);
      setAllTasks([]);
      setUsers([]);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const getTaskStatus = useCallback((task) => {
    // First, check for a direct 'status' property in the task's data.
    if (task.data?.status) {
      return task.data.status;
    }
    // Fallback to checking the board's column configuration.
    const board = boards.find(b => b.id === task.board_id);
    if (!board) return 'Not Started';
    const statusColumn = board.columns?.find(col => col.type === 'status');
    return task.data?.[statusColumn?.id] || 'Not Started';
  }, [boards]);

  const getTaskPriority = useCallback((task) => {
    const board = boards.find(b => b.id === task.board_id);
    if (!board) return null;
    const priorityColumn = board.columns?.find(col => col.type === 'priority');
    return task.data?.[priorityColumn?.id];
  }, [boards]);

  const getTaskDueDate = useCallback((task) => {
    // First, check if there's a direct due_date field in task data
    if (task.data?.due_date) {
      return task.data.due_date;
    }

    // Fallback to checking board columns for date field
    const board = boards.find(b => b.id === task.board_id);
    if (!board) return null;
    const dueDateColumn = board.columns?.find(col => col.type === 'date' && (col.title?.toLowerCase().includes('due') || col.title?.toLowerCase().includes('deadline')));
    return task.data?.[dueDateColumn?.id];
  }, [boards]);

  const isTaskCompleted = useCallback((task) => {
    const status = getTaskStatus(task)?.toLowerCase();
    return status === 'done' || status === 'completed' || status === 'complete';
  }, [getTaskStatus]);

  const isTaskOverdue = useCallback((task) => {
    const dueDate = getTaskDueDate(task);
    if (!dueDate) return false;
    // A task is overdue if it's not completed AND its due date is before today
    const taskDueDate = parseISO(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

    return !isTaskCompleted(task) && isBefore(taskDueDate, today);
  }, [getTaskDueDate, isTaskCompleted]);

  const applyFilters = useCallback(() => {
    let filtered = allTasks;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filters
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(task => {
        const status = getTaskStatus(task)?.toLowerCase();
        return filters.statuses.some(f => status?.includes(f.toLowerCase()));
      });
    }

    // Priority filters
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(task => {
        const priority = getTaskPriority(task)?.toLowerCase();
        return filters.priorities.some(f => priority?.includes(f.toLowerCase()));
      });
    }

    // Due date filters
    if (filters.dueDates.length > 0) {
      filtered = filtered.filter(task => {
        const dueDate = getTaskDueDate(task);
        if (!dueDate) return filters.dueDates.includes('no_date');
        
        const due = new Date(dueDate);
        const today = new Date();
        const overdueCheck = isTaskOverdue(task); // Use the new overdue check
        
        return filters.dueDates.some(filter => {
          if (filter === 'overdue' && overdueCheck) return true;
          if (filter === 'today' && due.toDateString() === today.toDateString()) return true;
          if (filter === 'this_week') {
            const weekFromNow = new Date();
            weekFromNow.setDate(today.getDate() + 7);
            return due >= today && due <= weekFromNow;
          }
          return false;
        });
      });
    }

    // Completion filters
    if (filters.completions.length > 0) {
      filtered = filtered.filter(task => {
        const completed = isTaskCompleted(task);
        if (filters.completions.includes('completed') && completed) {
          return true;
        }
        if (filters.completions.includes('incomplete') && !completed) {
          return true;
        }
        return false;
      });
    } else {
      // DEFAULT BEHAVIOR: if no completion filter is selected, hide completed tasks.
      filtered = filtered.filter(task => !isTaskCompleted(task));
    }

    setFilteredTasks(filtered);
  }, [allTasks, searchQuery, filters, getTaskStatus, getTaskPriority, getTaskDueDate, isTaskCompleted, isTaskOverdue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [allTasks, searchQuery, filters, applyFilters]); // Re-run applyFilters when its underlying dependencies change

  const getTaskAssignee = useCallback((task) => {
    // First, check if there's a direct assignee field in task data (common for custom tasks)
    if (task.data?.assignee) {
      let assignee = task.data.assignee;
      if (Array.isArray(assignee) && assignee.length > 0) {
        return assignee[0];
      }
      return assignee;
    }

    // Fallback to checking board columns for people field
    const board = boards.find(b => b.id === task.board_id);
    if (!board) return null;
    const assigneeColumn = board.columns?.find(col => col.type === 'people');
    if (!assigneeColumn) return null;
    
    let assignee = task.data?.[assigneeColumn.id];
    if (Array.isArray(assignee) && assignee.length > 0) {
      return assignee[0];
    }
    return assignee;
  }, [boards]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateTask = async (taskData) => {
    if (!selectedClientForNewTask || !user) return;
    
    const client = selectedClientForNewTask;
    const board = boards.find(b => b.id === client.board_id);
    
    if (!board) {
      console.error("No board found for client");
      toast.error("Failed to create task: Board not found for the selected client.");
      return;
    }

    // Destructure to separate top-level fields from data fields
    const { title, recurrence, description, assignees, due_date, priority, subtasks } = taskData;

    try {
      await Item.create({
        title: title,
        board_id: board.id,
        company_name: user.company_name,
        recurrence: recurrence || 'none',
        data: {
          description: description,
          assignee: assignees, // Pass the array of emails
          due_date: due_date,
          priority: priority,
          subtasks: subtasks,
          status: 'Not Started' // Set a default status
        }
      });
      setShowNewTaskModal(false);
      setSelectedClientForNewTask(null);
      loadData();
      toast.success("Task created successfully!");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task.");
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      // Include company_name in the update payload
      const updatePayload = {
        ...updates,
        company_name: user?.company_name // Use optional chaining for safety, though user should be loaded
      };
      
      // Fetch the full updated task from the backend
      const updatedTask = await Item.update(taskId, updatePayload);
      
      // Replace the old task with the full new one in the state
      setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      
      // Also update the selected task if it's the one being edited
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
        await Item.delete(taskId);
        setAllTasks(prev => prev.filter(t => t.id !== taskId));
        setShowTaskModal(false);
        setSelectedTask(null);
        toast.success("Task deleted successfully!");
    } catch (error) {
        console.error("Error deleting task:", error);
        toast.error("Failed to delete task.");
    }
  };

  const handleMarkTaskComplete = async (taskId) => {
    // Get the original list of tasks for rollback in case of error
    const originalAllTasks = [...allTasks];
    const taskToUpdate = originalAllTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      toast.error("Task not found.");
      return;
    }

    console.log('=== RECURRING TASK DEBUG START ===');
    console.log('Marking task complete:', taskToUpdate.title);
    console.log('Task recurrence:', taskToUpdate.recurrence);
    console.log('Task data:', taskToUpdate.data);

    const board = boards.find(b => b.id === taskToUpdate.board_id);
    if (!board) {
      toast.error("Could not find board for this task.");
      return;
    }

    // Prepare updated data for the *completed* task
    let completedTaskData = {
      ...(taskToUpdate.data || {}),
      status: 'Done', // General status
      date_completed: new Date().toISOString().split('T')[0] // New completion date
    };

    // Try to update the board column status if it exists
    const statusColumn = board.columns?.find(c => c.type === 'status');
    if (statusColumn) {
      const doneStatus = statusColumn.options?.choices?.find(c => 
        c.label.toLowerCase() === 'done' || c.label.toLowerCase() === 'completed'
      );
      if (doneStatus) {
        completedTaskData[statusColumn.id] = doneStatus.label;
      }
    }

    const optimisticallyUpdatedTask = { ...taskToUpdate, data: completedTaskData };

    // Optimistically update UI (mark current task as complete)
    setAllTasks(prev => prev.map(t => t.id === taskId ? optimisticallyUpdatedTask : t));

    try {
      // 1. Update the completed task in the backend
      await Item.update(taskId, {
        data: completedTaskData,
        company_name: user?.company_name
      });
      
      // 2. Handle recurrence if applicable
      if (taskToUpdate.recurrence && taskToUpdate.recurrence !== 'none') {
        console.log('Processing recurrence for:', taskToUpdate.title);
        
        let currentDueDate = taskToUpdate.data?.due_date; // Use original task's due date
        console.log('Current due date from task data:', currentDueDate);
        
        let nextDueDate = null;

        // If no current due date, base recurrence from today
        const baseDateForRecurrence = currentDueDate ? parseISO(currentDueDate) : new Date();
        baseDateForRecurrence.setHours(0,0,0,0); // Normalize to start of day

        console.log('Base date for recurrence calculation:', baseDateForRecurrence.toDateString());
          
        switch (taskToUpdate.recurrence) {
          case 'daily':
            baseDateForRecurrence.setDate(baseDateForRecurrence.getDate() + 1);
            break;
          case 'weekly':
            baseDateForRecurrence.setDate(baseDateForRecurrence.getDate() + 7);
            break;
          case 'monthly':
            baseDateForRecurrence.setMonth(baseDateForRecurrence.getMonth() + 1);
            break;
          default:
            console.warn("Unknown recurrence type:", taskToUpdate.recurrence);
            break;
        }
        
        nextDueDate = baseDateForRecurrence.toISOString().split('T')[0];

        console.log('Calculated next due date:', nextDueDate);

        if (nextDueDate) {
          // Create the new recurring task data (resetting status, completion date, and setting new due date)
          let newRecurringTaskData = {
            ...taskToUpdate.data, // Copy all existing data
            status: 'Not Started', // New task starts as Not Started
            date_completed: null, // Clear completion date for the new task
            due_date: nextDueDate // Set the calculated next due date
          };

          // Also set the board-specific status column for the new task if applicable
          if (statusColumn) {
            const notStartedStatus = statusColumn.options?.choices?.find(c => 
              c.label.toLowerCase() === 'not started' || c.label.toLowerCase() === 'todo'
            );
            if (notStartedStatus) {
              newRecurringTaskData[statusColumn.id] = notStartedStatus.label;
            } else {
              // Fallback if 'Not Started' isn't an option, use the first option or a default
              newRecurringTaskData[statusColumn.id] = statusColumn.options?.choices?.[0]?.label || 'Not Started';
            }
          }

          const newRecurringTaskPayload = {
            board_id: taskToUpdate.board_id,
            title: taskToUpdate.title,
            recurrence: taskToUpdate.recurrence,
            order_index: taskToUpdate.order_index, // Keep the same order index
            data: newRecurringTaskData,
            company_name: user.company_name,
          };

          console.log('Creating new recurring task with data:', newRecurringTaskPayload);
          
          const createdRecurringTask = await Item.create(newRecurringTaskPayload);
          console.log('New recurring task created with ID:', createdRecurringTask.id);
          
          // Update state: filter out the old task and add the newly created recurring task
          setAllTasks(prev => [
            ...prev.filter(t => t.id !== taskId), // Remove the completed task
            createdRecurringTask // Add the new recurring task
          ]);
          toast.success(`Task "${taskToUpdate.title}" completed. Next occurrence created for ${format(parseISO(nextDueDate), 'MMM d, yyyy')}.`);
        } else {
          // If nextDueDate couldn't be calculated, just remove the completed task
          setAllTasks(prev => prev.filter(t => t.id !== taskId));
          toast.success(`Task "${taskToUpdate.title}" completed.`);
        }
      } else {
        // If no recurrence, just remove the completed task (it's already marked as done by previous update)
        setAllTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success(`Task "${taskToUpdate.title}" completed.`);
      }
      
      console.log('=== RECURRING TASK DEBUG END ===');
    } catch (error) {
      console.error("Failed to mark task as complete or create recurring task:", error);
      // Rollback optimistic update
      setAllTasks(originalAllTasks);
      toast.error("Could not update the task. Please try again.");
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true); // Updated to showTaskModal
  };

  const clearFilters = () => {
    setFilters({
      statuses: [],
      priorities: [],
      dueDates: [],
      completions: []
    });
    setSearchQuery("");
  };

  const hasActiveFilters = () => {
    return searchQuery || 
           filters.statuses.length > 0 || 
           filters.priorities.length > 0 || 
           filters.dueDates.length > 0 || 
           filters.completions.length > 0;
  };

  // --- New Logic for Special Columns ---
  const overdueTasks = filteredTasks.filter(task => isTaskOverdue(task));
  // All tasks (including overdue) will be used for client columns
  const remainingTasks = filteredTasks; 

  // Get all board IDs associated with clients
  const clientBoardIds = clients.map(c => c.board_id).filter(Boolean); // Filter out null/undefined board_ids
  // Unassigned tasks are those remaining tasks whose board_id is not linked to any client
  const unassignedTasks = remainingTasks.filter(task => !clientBoardIds.includes(task.board_id));

  // Client-specific tasks are remaining tasks that BELONG to a client's board
  const tasksByClient = clients.map(client => {
    const clientTasks = remainingTasks.filter(task => task.board_id === client.board_id);
    return { client, tasks: clientTasks };
  }).filter(group => group.tasks.length > 0 || !searchQuery); // Keep all clients if not searching, or clients with tasks

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0073EA] mx-auto mb-4"></div>
          <p className="text-lg text-[#323338]">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#323338]">Client Tasks</h1>
              <p className="text-[#676879]">{filteredTasks.length} of {allTasks.length} tasks across {clients.length} clients</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-white border-gray-300"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-gray-300"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
                {hasActiveFilters() && (
                  <Badge className="ml-2 bg-[#0073EA] text-white rounded-full w-5 h-5 text-xs p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="relative mb-6">
              <TaskFilters
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilters(false)}
                onClear={clearFilters}
              />
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {/* Overdue Column */}
          <div key="overdue" className="flex-shrink-0 w-80">
            <div className="mb-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-t-xl border-b-2 border-red-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Overdue Tasks</h3>
                    <p className="text-sm text-red-600">{overdueTasks.length} tasks</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 bg-red-50/50 rounded-b-xl p-4 min-h-[400px]">
              {overdueTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  users={users} 
                  onTaskClick={handleTaskClick} 
                  onMarkTaskComplete={handleMarkTaskComplete} 
                  getTaskProps={{ getTaskStatus, getTaskPriority, getTaskDueDate, getTaskAssignee, getPriorityColor, isTaskCompleted, isTaskOverdue }} 
                />
              ))}
              {overdueTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No overdue tasks</p>
                </div>
              )}
            </div>
          </div>

          {/* Unassigned Column */}
          <div key="unassigned" className="flex-shrink-0 w-80">
            <div className="mb-4">
              <div className="flex items-center justify-between p-4 bg-gray-100 rounded-t-xl border-b-2 border-gray-400">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-200 text-gray-600">
                    <PackageOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">No Client</h3>
                    <p className="text-sm text-gray-600">{unassignedTasks.length} tasks</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 bg-gray-100/50 rounded-b-xl p-4 min-h-[400px]">
              {unassignedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  users={users} 
                  onTaskClick={handleTaskClick} 
                  onMarkTaskComplete={handleMarkTaskComplete} 
                  getTaskProps={{ getTaskStatus, getTaskPriority, getTaskDueDate, getTaskAssignee, getPriorityColor, isTaskCompleted, isTaskOverdue }} 
                />
              ))}
              {unassignedTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No tasks assigned to a client</p>
                </div>
              )}
            </div>
          </div>

          {tasksByClient.map(({ client, tasks }) => (
            <div key={client.id} className="flex-shrink-0 w-80">
              {/* Client Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-t-xl border-b-2" style={{ borderBottomColor: client.color || '#0073EA' }}>
                  <div className="flex items-center gap-3">
                    {client.avatar_url ? (
                      <img
                        src={client.avatar_url}
                        alt={`${client.name} logo`}
                        className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: client.color || '#0073EA' }}
                      >
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#323338]">{client.name}</h3>
                      <p className="text-sm text-[#676879]">{tasks.length} tasks</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedClientForNewTask(client);
                      setShowNewTaskModal(true);
                    }}
                    className="bg-[#0073EA] hover:bg-[#0056B3] text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tasks in this client column */}
              <div className="space-y-3 bg-gray-50 rounded-b-xl p-4 min-h-[400px]">
                {tasks.map(task => (
                   <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users} 
                    onTaskClick={handleTaskClick} 
                    onMarkTaskComplete={handleMarkTaskComplete} 
                    getTaskProps={{ getTaskStatus, getTaskPriority, getTaskDueDate, getTaskAssignee, getPriorityColor, isTaskCompleted, isTaskOverdue }} 
                   />
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {tasksByClient.length === 0 && overdueTasks.length === 0 && unassignedTasks.length === 0 && (
            <div className="flex-1 text-center py-16">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-[#323338] mb-2">No clients found</h3>
              <p className="text-[#676879]">Create your first client to get started with task management</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewTaskModal && selectedClientForNewTask && (
        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => {
            setShowNewTaskModal(false);
            setSelectedClientForNewTask(null);
          }}
          onSubmit={handleCreateTask}
          clients={[selectedClientForNewTask]}
        />
      )}

      {showTaskModal && selectedTask && (
        <TaskDetailModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          board={boards.find(b => b.id === selectedTask.board_id)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

// A new TaskCard component to avoid repetition
const TaskCard = ({ task, users, onTaskClick, onMarkTaskComplete, getTaskProps }) => {
  const { getTaskStatus, getTaskPriority, getTaskDueDate, getTaskAssignee, getPriorityColor, isTaskCompleted, isTaskOverdue } = getTaskProps;

  const completed = isTaskCompleted(task);
  const status = getTaskStatus(task);
  const priority = getTaskPriority(task);
  const dueDate = getTaskDueDate(task);
  const assigneeEmail = getTaskAssignee(task);
  const assigneeUser = users.find(u => u.email === assigneeEmail);
  const overdue = isTaskOverdue(task);

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md bg-white ${completed ? 'opacity-75' : ''}`}
      onClick={() => onTaskClick(task)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <button
                className={`p-1 -ml-1 rounded-full transition-colors ${
                  completed 
                    ? 'text-green-500' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-green-500'
                }`}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!completed) onMarkTaskComplete(task.id); 
                }}
                title={completed ? "Task completed" : "Mark as complete"}
              >
                {completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>
              <h4 className={`font-medium text-sm ${completed ? 'line-through text-gray-500' : 'text-[#323338]'}`}>
                {task.title}
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-1 text-xs mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                {status}
              </Badge>
              
              {priority && (
                <Badge variant="secondary" className={`${getPriorityColor(priority)} text-xs`}>
                  {priority}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-[#676879]">
              <div className="flex items-center gap-2">
                {dueDate && (
                  <div className={`flex items-center gap-1 ${overdue && !completed ? 'text-red-600' : ''}`}>
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(dueDate), 'MMM d')}
                  </div>
                )}
              </div>
              
              {/* Always show assignee information */}
              {assigneeUser && (
                <div className="flex items-center gap-1.5" title={assigneeUser.full_name}>
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={assigneeUser.avatar_url} alt={assigneeUser.full_name} />
                    <AvatarFallback className="text-[9px] bg-gray-200">
                      {assigneeUser.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">{assigneeUser.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
