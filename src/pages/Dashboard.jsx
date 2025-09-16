
import React, { useState, useEffect } from "react";
import { Client } from "@/api/entities";
import { Item } from "@/api/entities";
import { Board } from "@/api/entities";
import { TimeEntry } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Square,
  Calendar,
  User as UserIcon,
  Building2,
  MessageSquare,
  Timer,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format, differenceInMinutes, isToday } from "date-fns";

import AssignedTasks from "../components/dashboard/AssignedTasks";
import TimeTracker from "../components/dashboard/TimeTracker";
import DashboardAIChat from "../components/dashboard/DashboardAIChat";
import CompleteTaskModal from "../components/dashboard/CompleteTaskModal";

// Correctly filters tasks to show only those assigned to the current user.
const isTaskAssignedToUser = (task, userEmail, allBoards) => {
  if (!task || !userEmail) {
    return false;
  }

  const normalizedUserEmail = userEmail.toLowerCase();

  // 1. Check for a direct 'assignee' field in task.data (most common case)
  const directAssignee = task.data?.assignee;
  if (directAssignee) {
    if (typeof directAssignee === 'string' && directAssignee.toLowerCase() === normalizedUserEmail) {
      return true;
    }
    // Handle cases where assignee is an array of emails
    if (Array.isArray(directAssignee) && directAssignee.map(e => e.toLowerCase()).includes(normalizedUserEmail)) {
      return true;
    }
  }

  // 2. Fallback for boards that use a custom 'people' column for assignments
  const board = allBoards.find(b => b.id === task.board_id);
  if (board && board.columns) {
    const peopleColumns = board.columns.filter(col => col.type === 'people');
    for (const col of peopleColumns) {
      const columnAssignees = task.data?.[col.id];
      if (columnAssignees) {
        if (typeof columnAssignees === 'string' && columnAssignees.toLowerCase() === normalizedUserEmail) {
          return true;
        }
        if (Array.isArray(columnAssignees) && columnAssignees.map(e => e.toLowerCase()).includes(normalizedUserEmail)) {
          return true;
        }
      }
    }
  }

  return false;
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [boards, setBoards] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [currentTimer, setCurrentTimer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [completingTaskInfo, setCompletingTaskInfo] = useState(null); // New state for modal
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Automatically switch AI chat context to the client being tracked
  useEffect(() => {
    if (currentTimer && currentTimer.client_id) {
      setSelectedClient(currentTimer.client_id);
    }
  }, [currentTimer]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load current user
      const currentUser = await User.me();
      setUser(currentUser);
      console.log('Dashboard: User loaded:', currentUser);

      let clientsData = [];
      let boardsData = [];
      let itemsData = [];
      let timeEntriesData = [];
      let usersData = [];
      let runningTimer = null; // Declared here to be accessible for selectedClient logic

      // Load all data with better error handling for each parallel fetch
      try {
        clientsData = await Client.list('-updated_date');
        console.log('Dashboard: Clients loaded:', clientsData.length, 'clients');
        setClients(clientsData);
      } catch (error) {
        console.error('Dashboard: Failed to load clients:', error);
        setClients([]); // Ensure it's an empty array, not undefined
      }

      try {
        boardsData = await Board.list('-updated_date');
        console.log('Dashboard: Boards loaded:', boardsData.length, 'boards');
        setBoards(boardsData);
      } catch (error) {
        console.error('Dashboard: Failed to load boards:', error);
        setBoards([]);
      }

      try {
        itemsData = await Item.list('-updated_date'); // Fetch ALL items
        console.log('Dashboard: Items loaded:', itemsData.length, 'items');
        
        // Filter assigned tasks using the correctly scoped helper function
        // boardsData is available due to sequential loading or previous assignment
        const userTasks = itemsData.filter(item => isTaskAssignedToUser(item, currentUser.email, boardsData));
        console.log('Dashboard: User tasks filtered:', userTasks.length, 'tasks');
        setAssignedTasks(userTasks);
      } catch (error) {
        console.error('Dashboard: Failed to load items:', error);
        setAssignedTasks([]);
      }

      try {
        timeEntriesData = await TimeEntry.filter({ user_email: currentUser.email }, '-start_time', 20);
        console.log('Dashboard: Time entries loaded:', timeEntriesData.length, 'entries');
        setTimeEntries(timeEntriesData);

        // Check for running timer
        runningTimer = timeEntriesData.find(entry => entry.is_running);
        if (runningTimer) {
          console.log('Dashboard: Found running timer:', runningTimer);
          setCurrentTimer(runningTimer);
        }
      } catch (error) {
        console.error('Dashboard: Failed to load time entries:', error);
        setTimeEntries([]);
      }

      try {
        usersData = await User.list();
        console.log('Dashboard: Users loaded:', usersData.length, 'users');
        setUsers(usersData);
      } catch (error) {
        console.error('Dashboard: Failed to load users:', error);
        setUsers([]);
      }

      // Set default selected client (first client or client with running timer)
      // Use the clientsData and runningTimer variables already fetched and populated
      if (runningTimer && runningTimer.client_id) {
        setSelectedClient(runningTimer.client_id);
      } else if (clientsData.length > 0) {
        setSelectedClient(clientsData[0].id);
      } else {
        setSelectedClient(null); // Ensure selectedClient is null if no clients are loaded
      }

    } catch (error) {
      console.error("Dashboard: Error loading dashboard data (main catch):", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimerUpdate = (timerData) => {
    const oldTimer = currentTimer;
    // If timer is being stopped and it was linked to a task
    if (!timerData && oldTimer?.task_id) {
      const task = assignedTasks.find(t => t.id === oldTimer.task_id);
      if (task) {
        setCompletingTaskInfo({ ...oldTimer, title: task.title });
      }
    }

    setCurrentTimer(timerData);
    // Reload time entries to show updated data
    loadTimeEntries();
  };

  const loadTimeEntries = async () => {
    if (!user) return;
    try {
      const entries = await TimeEntry.filter({ user_email: user.email }, '-start_time', 20);
      setTimeEntries(entries);
    } catch (error) {
      console.error("Error loading time entries:", error);
    }
  };

  const getBoardForTask = (task) => {
    return boards.find(b => b.id === task.board_id);
  };

  const handleMarkTaskComplete = async (taskId) => {
    const originalTasks = [...assignedTasks];
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    // Update the task status to Done and set completion date
    const updatedTaskData = {
      ...(taskToUpdate.data || {}),
      status: 'Done',
      date_completed: new Date().toISOString().split('T')[0]
    };

    const updatedTask = { ...taskToUpdate, data: updatedTaskData };
    
    // Optimistically update UI by removing the completed task
    setAssignedTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      // Save the completed task status to the backend
      await Item.update(taskId, {
        data: updatedTask.data,
        company_name: user.company_name
      });

      // If the task has recurrence, create a new one
      if (taskToUpdate.recurrence && taskToUpdate.recurrence !== 'none') {
        let currentDueDate = taskToUpdate.data?.due_date;
        let nextDueDate = null;
        
        // Use current due date if available, otherwise use today as the base
        const baseDateForRecurrence = currentDueDate ? new Date(currentDueDate + 'T00:00:00') : new Date();

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
        }
        nextDueDate = baseDateForRecurrence.toISOString().split('T')[0];

        if (nextDueDate) {
          // Create the new recurring task
          const newRecurringTaskData = {
            ...taskToUpdate.data,
            status: 'Not Started',
            date_completed: null, // Clear completion date
            due_date: nextDueDate // Set the new due date
          };

          const newRecurringTask = {
            board_id: taskToUpdate.board_id,
            title: taskToUpdate.title,
            recurrence: taskToUpdate.recurrence,
            order_index: taskToUpdate.order_index,
            data: newRecurringTaskData,
            company_name: user.company_name,
          };
          
          const created = await Item.create(newRecurringTask);
          
          // Add the new recurring task to the state if it's still assigned to the user
           const isAssignedToMe = isTaskAssignedToUser(created, user.email, boards); // Re-use the assignment logic

          if (isAssignedToMe) {
              setAssignedTasks(prev => [...prev, created]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to mark task as complete on dashboard:", error);
      // Rollback optimistic update on failure
      setAssignedTasks(originalTasks); 
      alert("Could not update the task. Please try again.");
    }
  };

  const handleStartTimerForTask = async (task) => {
    if (currentTimer || !user) return; // Prevent starting if another timer is running or user not loaded

    const client = clients.find(c => c.board_id === task.board_id);

    if (!client) {
      console.error("Cannot start timer: Client not found for this task's board.");
      alert("Could not start timer because the client for this task could not be found.");
      return;
    }

    // New, more robust logic for selecting work category
    let work_category_to_use;
    const clientCategories = client.work_categories || [];

    if (task.data?.work_category) {
      // 1. Use category set directly on the task
      work_category_to_use = task.data.work_category;
    } else if (client.default_work_category && clientCategories.includes(client.default_work_category)) {
      // 2. Use the client's default category if it exists
      work_category_to_use = client.default_work_category;
    } else if (clientCategories.length > 0) {
      // 3. Fallback to the first available category for the client
      work_category_to_use = clientCategories[0];
    } else {
      // 4. Ultimate fallback if no categories are configured
      work_category_to_use = 'General Task';
    }
    
    try {
      // First, update the task status to "In Progress" if it's not already completed
      const currentStatus = task.data?.status?.toLowerCase();
      if (currentStatus !== 'done' && currentStatus !== 'completed' && currentStatus !== 'complete') {
        const updatedTaskData = {
          ...task.data,
          status: 'In Progress' // Set to a working status
        };

        await Item.update(task.id, {
          data: updatedTaskData,
          company_name: user.company_name
        });

        // Update the task in the local state
        setAssignedTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, data: updatedTaskData }
            : t
        ));
      }

      // Then create the time entry
      const entry = await TimeEntry.create({
        client_id: client.id,
        board_id: task.board_id,
        task_id: task.id,
        user_email: user.email,
        user_name: user.full_name,
        description: task.title,
        work_category: work_category_to_use,
        start_time: new Date().toISOString(),
        billable: true,
        is_running: true,
        hourly_rate: user.hourly_rate || 75, // Use user's hourly rate if available, otherwise default
        company_name: user.company_name // Added missing company_name
      });
      setCurrentTimer(entry);
      loadTimeEntries();
    } catch (error) {
      console.error('Error starting timer from task:', error);
      alert(`Failed to start timer: ${error.message}`);
    }
  };

  const handleTaskCompletionConfirm = async (isComplete) => {
    if (isComplete && completingTaskInfo?.task_id) {
      await handleMarkTaskComplete(completingTaskInfo.task_id);
    }
    setCompletingTaskInfo(null); // Close the modal
  };

  const handleUpdateTask = (taskId, updates) => {
    if (updates === null) {
      // Task was deleted
      setAssignedTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      // Task was updated
      setAssignedTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ));
    }
  };

  const getTodaysHours = () => {
    const todaysEntries = timeEntries.filter(entry =>
      isToday(new Date(entry.start_time)) && entry.duration_minutes
    );
    const totalMinutes = todaysEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    return totalMinutes / 60;
  };

  const getWeeksHours = () => {
    const thisWeek = new Date();
    // Set to start of the current week (Sunday)
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0); // Set time to beginning of the day

    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= thisWeek && entry.duration_minutes;
    });

    const totalMinutes = weekEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    return totalMinutes / 60;
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">
              Welcome back, {user?.full_name || 'User'}!
            </h1>
            <p className="text-[#676879] mt-1">
              Here's what's on your plate today
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{getTodaysHours().toFixed(1)}h</p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{getWeeksHours().toFixed(1)}h</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{assignedTasks.length}</p>
                <p className="text-xs text-gray-500">Tasks</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Assigned Tasks */}
          <AssignedTasks
            tasks={assignedTasks}
            boards={boards}
            clients={clients}
            onMarkComplete={handleMarkTaskComplete}
            isLoading={isLoading}
            currentTimer={currentTimer}
            onStartTimer={handleStartTimerForTask}
            onUpdateTask={handleUpdateTask}
            users={users}
          />

          {/* Right Side - Time Tracking */}
          <TimeTracker
            clients={clients}
            currentTimer={currentTimer}
            timeEntries={timeEntries}
            user={user}
            assignedTasks={assignedTasks}
            boards={boards}
            onTimerUpdate={handleTimerUpdate}
          />
        </div>

        {/* Bottom Section - AI Chat */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                AI Assistant
              </CardTitle>
              <Select
                value={selectedClient || ''}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select client for AI context" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: client.color || '#0073EA' }}
                        />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <DashboardAIChat
              selectedClient={selectedClient}
              clients={clients}
              boards={boards}
              assignedTasks={assignedTasks}
              user={user}
            />
          </CardContent>
        </Card>
      </div>

      {/* Task Completion Modal */}
      <CompleteTaskModal
        task={completingTaskInfo}
        onConfirm={handleTaskCompletionConfirm}
      />
    </div>
  );
}
