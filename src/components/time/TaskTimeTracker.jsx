
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  Timer
} from "lucide-react";
import { motion } from "framer-motion";
import { TimeEntry } from "@/api/entities";
import { format, differenceInSeconds } from "date-fns";

export default function TaskTimeTracker({ clients, tasks, user, currentTimer, onTimerUpdate }) {
  const [isTracking, setIsTracking] = useState(!!currentTimer);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedWorkCategory, setSelectedWorkCategory] = useState('');

  useEffect(() => {
    setIsTracking(!!currentTimer);
    if (currentTimer) {
      setSelectedClient(currentTimer.client_id);
      // Ensure the selected task is correctly set, handling cases where it might be null/undefined
      setSelectedTask(currentTimer.task_id || 'none'); // Use 'none' if no task is associated with current timer
      setDescription(currentTimer.description || '');
      setSelectedWorkCategory(currentTimer.work_category || '');
    }
  }, [currentTimer]);

  useEffect(() => {
    let interval;
    if (isTracking && currentTimer) {
      const start = new Date(currentTimer.start_time);
      setElapsedTime(differenceInSeconds(new Date(), start));
      
      interval = setInterval(() => {
        setElapsedTime(differenceInSeconds(new Date(), start));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentTimer]);

  useEffect(() => {
    if (selectedTask && selectedTask !== 'none') {
        const task = tasks.find(t => t.id === selectedTask);
        if (task) {
            setDescription(task.title);
        }
    } else if (!isTracking) { // Only clear description if not tracking
        setDescription('');
    }
  }, [selectedTask, tasks, isTracking]);

  // Clear work category and task when client changes
  useEffect(() => {
    if (!isTracking) { // Only reset if not currently tracking
      setSelectedWorkCategory('');
      setSelectedTask('none'); // Reset to 'none' for no specific task
    }
  }, [selectedClient, isTracking]);

  const startTimer = async () => {
    if (!selectedClient || !user || !selectedWorkCategory) return;
    
    let timerDescription = description.trim();
    
    // If a task is selected, its title takes precedence.
    if (selectedTask && selectedTask !== 'none') {
        const task = tasks.find(t => t.id === selectedTask);
        if (task) timerDescription = task.title;
    }
    
    // If there's still no description, use the work category as the default.
    if (!timerDescription) {
        timerDescription = selectedWorkCategory;
    }

    const client = clients.find(c => c.id === selectedClient);

    try {
      const entry = await TimeEntry.create({
        client_id: selectedClient,
        board_id: client?.board_id || null,
        task_id: (selectedTask && selectedTask !== 'none') ? selectedTask : null,
        user_email: user.email,
        user_name: user.full_name,
        description: timerDescription,
        work_category: selectedWorkCategory,
        start_time: new Date().toISOString(),
        billable: true,
        is_running: true,
        hourly_rate: user.hourly_rate || 75,
        company_name: user.company_name
      });

      onTimerUpdate(entry);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!currentTimer) return;

    try {
      const endTime = new Date();
      const startTime = new Date(currentTimer.start_time);
      const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      await TimeEntry.update(currentTimer.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationInMinutes,
        is_running: false
      });

      onTimerUpdate(null);
      setSelectedClient('');
      setSelectedTask('none'); // Reset to 'none'
      setDescription('');
      setSelectedWorkCategory('');

    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatLiveTime = (totalSeconds) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const tasksForSelectedClient = selectedClient
    ? tasks.filter(task => {
        const client = clients.find(c => c.id === selectedClient);
        return client && task.board_id === client.board_id && !task.data?.date_completed;
    })
    : [];

  const workCategoriesForSelectedClient = selectedClient
    ? clients.find(c => c.id === selectedClient)?.work_categories || []
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-600" />
          Start New Timer
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isTracking && currentTimer ? (
          <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <motion.div
              className="text-5xl font-mono font-bold text-blue-600 mb-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {formatLiveTime(elapsedTime)}
            </motion.div>
            <p className="text-gray-600 font-medium">{currentTimer.description}</p>
             <Badge variant="outline" className="text-xs mt-2">
                {clients.find(c => c.id === currentTimer.client_id)?.name}
             </Badge>
          </div>
        ) : null}

        <div className="space-y-3">
            {!isTracking && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Client *</label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients && clients.length > 0 ? (
                          clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: client.color || '#0073EA' }}
                                />
                                {client.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : null}
                      </SelectContent>
                    </Select>
                    {clients && clients.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">No clients available</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700">Work Category *</label>
                     <Select value={selectedWorkCategory} onValueChange={setSelectedWorkCategory} disabled={!selectedClient}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a work category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {workCategoriesForSelectedClient.length > 0 ? (
                              workCategoriesForSelectedClient.map(category => (
                                  <SelectItem key={category} value={category}>
                                      {category}
                                  </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="disabled" disabled> {/* Use a distinct disabled value */}
                                {selectedClient ? "No work categories configured for this client" : "Select a client first"}
                              </SelectItem>
                            )}
                        </SelectContent>
                     </Select>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700">Task (Optional)</label>
                     <Select value={selectedTask} onValueChange={setSelectedTask} disabled={!selectedClient}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a task..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No specific task</SelectItem>
                            {tasksForSelectedClient.length > 0 ? (
                              tasksForSelectedClient.map(task => (
                                  <SelectItem key={task.id} value={task.id}>
                                      {task.title}
                                  </SelectItem>
                              ))
                            ) : selectedClient ? (
                              <SelectItem value="disabled-tasks" disabled>No tasks found for this client</SelectItem>
                            ) : null}
                        </SelectContent>
                     </Select>
                  </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <Input 
                        placeholder="What are you working on?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={selectedTask !== 'none'} // Disable if a specific task is selected
                    />
                </div>
                </div>
            )}

            <div className="flex gap-2">
              {!isTracking ? (
                <Button 
                  onClick={startTimer}
                  disabled={!selectedClient || !selectedWorkCategory}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Timer
                </Button>
              ) : (
                <Button 
                  onClick={stopTimer}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Timer
                </Button>
              )}
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
