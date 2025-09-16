
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle,
  User,
  Calendar,
  Flag,
  RefreshCw,
  Tag,
  Building2 // Added Building2 icon for Client
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Fixed: Added .css extension
import { toast } from "sonner";

import TaskUpdatesFeed from './TaskUpdatesFeed';
import { Client } from '@/api/entities';
import { User as UserEntity } from '@/api/entities';
import { Board } from '@/api/entities'; // Added Board entity import
import { Item } from '@/api/entities'; // Added Item entity import

const PropertyRow = ({ icon, label, children }) => (
  <div className="grid grid-cols-3 items-center text-sm py-3 border-b border-gray-100">
    <div className="col-span-1 flex items-center gap-3 text-gray-500 font-medium">
      {icon}
      <span>{label}</span>
    </div>
    <div className="col-span-2">
      {children}
    </div>
  </div>
);

export default function TaskDetailModal({ isOpen, onClose, task, board, onUpdate, onDelete }) {
  const [currentTask, setCurrentTask] = useState(task);
  const [client, setClient] = useState(null);
  const [allClients, setAllClients] = useState([]); // Store all clients
  const [users, setUsers] = useState([]);
  const [description, setDescription] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // Added currentUser state

  useEffect(() => {
    if (task) {
      setCurrentTask(task);
      setDescription(task.data?.description || '');
    }

    const loadData = async () => {
      try {
        // Get current user first
        const user = await UserEntity.me();
        setCurrentUser(user);
        
        // Fetch all clients for the dropdown
        const allClientsData = await Client.list();
        setAllClients(allClientsData);

        // Determine the current client for the task based on its board_id
        if (task?.board_id) {
          const currentTaskBoardClient = allClientsData.find(c => c.board_id === task.board_id);
          if (currentTaskBoardClient) {
            setClient(currentTaskBoardClient);
          } else if (board) { // Fallback to board prop if task board_id doesn't directly map
             const clientsForBoardProp = allClientsData.filter(c => c.board_id === board.id);
             if (clientsForBoardProp.length > 0) {
                 setClient(clientsForBoardProp[0]);
             }
          }
        } else if (board) { // If task has no board_id, use the board prop's client
          const clientsForBoardProp = allClientsData.filter(c => c.board_id === board.id);
          if (clientsForBoardProp.length > 0) {
            setClient(clientsForBoardProp[0]);
          }
        }

        const allUsers = await UserEntity.list();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [task, board, isOpen]);

  if (!isOpen || !task || !currentTask) return null;

  const handleLocalUpdate = (updates) => {
    // Include company_name in updates to satisfy RLS requirements
    const updatePayload = {
      ...updates,
      company_name: currentUser?.company_name
    };
    
    // This function updates the backend via the prop and then updates local state for immediate UI feedback.
    onUpdate(currentTask.id, updatePayload);
    setCurrentTask(prev => ({ ...prev, ...updates, data: { ...prev.data, ...updates.data } }));
  };

  const handleDataUpdate = (field, value) => {
    if (!currentTask) return;
    handleLocalUpdate({ data: { [field]: value } });
  };

  const handleRecurrenceUpdate = (value) => {
    if (!currentTask) return;
    handleLocalUpdate({ recurrence: value });
  };

  const handleDescriptionBlur = () => {
    if (!currentTask) return;

    const currentDescription = currentTask.data?.description || '';
    if (description !== currentDescription) {
        handleDataUpdate('description', description);
    }
  };

  const handleClientChange = async (newClientId) => {
    if (!newClientId || newClientId === client?.id) return;

    const selectedClient = allClients.find(c => c.id === newClientId);
    if (!selectedClient || !selectedClient.board_id) {
        toast.error("Selected client does not have a board.");
        return;
    }

    try {
      // Use the handleLocalUpdate to persist the change
      handleLocalUpdate({ board_id: selectedClient.board_id });
      setClient(selectedClient); // Update local client state
      toast.success(`Task moved to ${selectedClient.name}'s board.`);
    } catch (error) {
      console.error("Error changing client:", error);
      toast.error(`Failed to move task: ${error.message}`);
    }
  };

  const handleMarkComplete = () => {
    handleDataUpdate('status', 'Done');
    onClose();
  };

  const isCompleted = currentTask.data?.status === 'Done';

  const getTaskType = () => {
    if (!currentTask.recurrence || currentTask.recurrence === 'none') {
      return 'once-off';
    }
    return currentTask.recurrence;
  };

  const currentAssigneeEmail = currentTask.data?.assignee || currentTask.data?.assigned_to || '';
  const currentDueDate = currentTask.data?.due_date || currentTask.data?.deadline || '';
  const currentPriority = currentTask.data?.priority || 'medium';
  const currentWorkCategory = currentTask.data?.work_category || '';

  const handleAssigneeChange = (userEmail) => {
    handleDataUpdate('assignee', userEmail);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
        <div className="p-4 border-b flex items-center justify-start flex-shrink-0">
           <Button
                variant="outline"
                size="sm"
                onClick={handleMarkComplete}
                disabled={isCompleted}
                className="flex items-center gap-2"
            >
                <CheckCircle className={`w-4 h-4 ${isCompleted ? 'text-green-500' : ''}`} />
                {isCompleted ? 'Mark Complete' : 'Mark Complete'}
            </Button>
        </div>

        <div className="grid grid-cols-3 gap-x-8 flex-grow overflow-hidden">
          <div className="col-span-2 flex flex-col overflow-y-auto px-6 pt-4">
            <Input
              value={currentTask.title || ''}
              onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
              onBlur={() => handleLocalUpdate({ title: currentTask.title })}
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 h-auto p-0 mb-4"
            />

            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
                <div className="bg-gray-50 rounded-lg">
                    <ReactQuill
                        theme="snow"
                        value={description}
                        onChange={setDescription}
                        onBlur={handleDescriptionBlur}
                        modules={{ toolbar: [
                            [{ 'header': [1, 2, false] }],
                            ['bold', 'italic', 'underline'],
                            ['blockquote', 'code-block'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link'],
                            ['clean']
                        ]}}
                        className="min-h-24"
                        placeholder="Add a description..."
                    />
                </div>
            </div>

            <TaskUpdatesFeed task={currentTask} />
          </div>

          <div className="col-span-1 border-l bg-gray-50 px-4 py-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Details</h2>

            <div className="space-y-0">
              <PropertyRow icon={<Building2 className="w-4 h-4" />} label="Client">
                <Select value={client?.id || ''} onValueChange={handleClientChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                           <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.color || '#0073EA' }}
                          />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              {/* Always show assignee field regardless of user role */}
              <PropertyRow icon={<User className="w-4 h-4" />} label="Assignee">
                <Select value={currentAssigneeEmail || 'unassigned'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.email} value={user.email}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow icon={<Calendar className="w-4 h-4" />} label="Due Date">
                <Input
                  type="date"
                  value={currentDueDate}
                  onChange={(e) => handleDataUpdate('due_date', e.target.value)}
                  className="h-8 text-sm"
                />
              </PropertyRow>

              <PropertyRow icon={<Flag className="w-4 h-4" />} label="Priority">
                <Select value={currentPriority} onValueChange={(value) => handleDataUpdate('priority', value)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow icon={<Tag className="w-4 h-4" />} label="Work Category">
                <Select value={currentWorkCategory} onValueChange={(value) => handleDataUpdate('work_category', value)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {client?.work_categories?.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropertyRow>

              <PropertyRow icon={<RefreshCw className="w-4 h-4" />} label="Type">
                <Select value={getTaskType()} onValueChange={handleRecurrenceUpdate}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once-off">Once Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </PropertyRow>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
