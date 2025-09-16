
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Repeat, Calendar as CalendarIcon, User, Building2, Plus, X, Trash2 } from 'lucide-react';
import { format } from "date-fns";
import { Client } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";

export default function NewTaskModal({ isOpen, onClose, onSubmit, clients }) {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    client_id: '',
    assignees: [],
    due_date: null,
    priority: 'medium',
    recurrence: 'none',
    subtasks: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const usersData = await UserEntity.list();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Helper function to format date in local timezone
  const formatDateForSubmission = (date) => {
    if (!date) return null;
    
    // Get the date components in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Return in YYYY-MM-DD format without timezone conversion
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.title.trim()) return;

    setIsSubmitting(true);
    try {
      // Format the task data for submission
      const formattedTaskData = {
        ...taskData,
        due_date: taskData.due_date ? formatDateForSubmission(taskData.due_date) : null,
        assignees: taskData.assignees, // Keep as array
        // subtasks are already in the correct object format from state
        subtasks: taskData.subtasks
      };
      
      await onSubmit(formattedTaskData);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setTaskData({
      title: '',
      description: '',
      client_id: '',
      assignees: [],
      due_date: null,
      priority: 'medium',
      recurrence: 'none',
      subtasks: []
    });
    setNewSubtask('');
    onClose();
  };
  
  const handleClientChange = (clientId) => {
      const selectedClient = clients.find(c => c.id === clientId);
      let newAssignees = [];
      if (selectedClient && selectedClient.default_assignee_email) {
          if (!taskData.assignees.includes(selectedClient.default_assignee_email)) {
             newAssignees = [...taskData.assignees, selectedClient.default_assignee_email];
          } else {
             newAssignees = taskData.assignees;
          }
      } else {
          newAssignees = taskData.assignees;
      }
      setTaskData(prev => ({
          ...prev,
          client_id: clientId,
          assignees: newAssignees
      }));
  }

  const addAssignee = (userId) => {
    if (!taskData.assignees.includes(userId)) {
      setTaskData(prev => ({
        ...prev,
        assignees: [...prev.assignees, userId]
      }));
    }
  };

  const removeAssignee = (userId) => {
    setTaskData(prev => ({
      ...prev,
      assignees: prev.assignees.filter(id => id !== userId)
    }));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9); // Generate unique ID
      setTaskData(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, { id: newId, title: newSubtask.trim(), completed: false }]
      }));
      setNewSubtask('');
    }
  };

  const removeSubtask = (index) => {
    setTaskData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
  };

  const toggleSubtaskCompletion = (subtaskId) => {
    setTaskData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(subtask =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      )
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      addSubtask();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Create New Task
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700 font-medium">
              Task Title *
            </Label>
            <Input
              id="title"
              value={taskData.title}
              onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg h-12"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={taskData.description}
              onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description..."
              className="bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Client Assignment */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              <Building2 className="w-4 h-4 inline mr-2" />
              Assign to Client
            </Label>
            <Select 
              value={taskData.client_id}
              onValueChange={handleClientChange}
            >
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 rounded-lg h-12">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No client (unassigned)</SelectItem>
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

          {/* Staff Assignment */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              <User className="w-4 h-4 inline mr-2" />
              Assign to Staff
            </Label>
            <Select onValueChange={addAssignee}>
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 rounded-lg h-12">
                <SelectValue placeholder="Add staff member..." />
              </SelectTrigger>
              <SelectContent>
                {users.filter(user => !taskData.assignees.includes(user.email)).map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {user.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      {user.full_name} ({user.email})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Assignees */}
            {taskData.assignees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {taskData.assignees.map(assigneeEmail => {
                  const user = users.find(u => u.email === assigneeEmail);
                  return (
                    <Badge key={assigneeEmail} className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {user?.full_name || assigneeEmail}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 hover:bg-transparent"
                        onClick={() => removeAssignee(assigneeEmail)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-gray-50 border-gray-300 text-gray-800 rounded-lg h-12"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskData.due_date ? format(taskData.due_date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={taskData.due_date}
                    onSelect={(date) => setTaskData(prev => ({ ...prev, due_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Priority
              </Label>
              <Select 
                value={taskData.priority}
                onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 rounded-lg h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Critical
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              <Repeat className="w-4 h-4 inline mr-2" />
              Recurrence
            </Label>
            <Select 
              value={taskData.recurrence}
              onValueChange={(value) => setTaskData(prev => ({ ...prev, recurrence: value }))}
            >
              <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 rounded-lg h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recurrence</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Subtasks
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a subtask..."
                  className="flex-1 bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 rounded-lg h-10"
                />
                <Button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 px-4"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Subtask List */}
              {taskData.subtasks.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {taskData.subtasks.map((subtask, index) => (
                    <div key={subtask.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => toggleSubtaskCompletion(subtask.id)}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        />
                        <span className={`text-sm text-gray-700 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                          {subtask.title}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubtask(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!taskData.title.trim() || isSubmitting}
              className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-lg h-12 px-6 font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
