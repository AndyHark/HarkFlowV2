
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  Clock, 
  Calendar,
  Timer,
  Tag,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";
import { TimeEntry } from "@/api/entities";
import { format, differenceInMinutes, isToday, differenceInSeconds } from "date-fns";

export default function TimeTracker({ clients, currentTimer, timeEntries, user, assignedTasks, boards, onTimerUpdate }) {
  const [isTracking, setIsTracking] = useState(!!currentTimer);
  const [selectedClient, setSelectedClient] = useState('');
  const [workCategory, setWorkCategory] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  // FIX: This useEffect hook ensures the component's internal 'isTracking' state
  // is always in sync with the 'currentTimer' prop from the parent Dashboard.
  useEffect(() => {
    setIsTracking(!!currentTimer);
  }, [currentTimer]);

  useEffect(() => {
    if (currentTimer) {
      setSelectedClient(currentTimer.client_id);
      setWorkCategory(currentTimer.description || currentTimer.work_category || '');
    } else if (clients.length > 0) { // Changed from relevantClients to clients
      // Default to the first client if no timer is running
      setSelectedClient(clients[0].id); // Changed from relevantClients to clients
    }
  }, [currentTimer, clients]); // Changed from relevantClients to clients

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
    if (selectedClient) {
      const client = clients.find(c => c.id === selectedClient); // Changed from relevantClients to clients
      if (client?.work_categories?.length > 0) {
        if (!client.work_categories.includes(workCategory)) {
          setWorkCategory(client.work_categories[0]);
        }
      } else {
        setWorkCategory('');
      }
    } else {
        setWorkCategory('');
    }
  }, [selectedClient, clients, workCategory]); // Changed from relevantClients to clients

  const startTimer = async () => {
    if (!selectedClient || !workCategory || !user) return;

    try {
      const entry = await TimeEntry.create({
        client_id: selectedClient,
        user_email: user.email,
        user_name: user.full_name,
        description: workCategory,
        work_category: workCategory,
        start_time: new Date().toISOString(),
        billable: true,
        is_running: true,
        hourly_rate: user.hourly_rate || 0,
        company_name: user.company_name, // Added this line
      });

      setIsTracking(true);
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

      setIsTracking(false);
      onTimerUpdate(null);
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatTimeFromSeconds = (totalSeconds) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatLiveTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const getTodaysEntries = () => {
    return timeEntries.filter(entry => isToday(new Date(entry.start_time)));
  };

  const getTodaysTotalInSeconds = () => {
    const todaysEntries = getTodaysEntries();
    const totalSecondsOfCompleted = todaysEntries.reduce((sum, entry) => {
        if (currentTimer && entry.id === currentTimer.id) {
            return sum;
        }
        return sum + ((entry.duration_minutes || 0) * 60);
    }, 0);

    const runningTimerElapsedSeconds = isTracking ? elapsedTime : 0;

    return totalSecondsOfCompleted + runningTimerElapsedSeconds;
  };

  const selectedClientData = clients.find(c => c.id === selectedClient); // Changed from relevantClients to clients
  const availableCategories = selectedClientData?.work_categories || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-blue-600" />
          Time Tracking
          <Badge variant="outline" className="ml-auto">
            Today: {formatTimeFromSeconds(getTodaysTotalInSeconds())}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Show message if no clients */}
        {clients.length === 0 && !currentTimer && (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No clients found.</p>
            <p className="text-xs mt-1">Please add a client to start tracking time.</p>
          </div>
        )}

        {/* Current Timer Display */}
        {isTracking && currentTimer && (
          <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <motion.div
              className="text-4xl font-mono font-bold text-blue-600 mb-2"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {formatLiveTime(elapsedTime)}
            </motion.div>
            <p className="text-gray-600 font-medium">{currentTimer.description || workCategory}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className="text-xs bg-green-100 text-green-800">
                Billable
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedClientData?.name || clients.find(c => c.id === currentTimer.client_id)?.name}
              </Badge>
            </div>
          </div>
        )}

        {/* Timer Controls - only show if we have clients */}
        {(clients.length > 0 || isTracking) && (
          <div className="space-y-3">
            {!isTracking ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Client</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Work Category</label>
                  <Select 
                    value={workCategory} 
                    onValueChange={setWorkCategory}
                    disabled={!selectedClient || availableCategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <Tag className="w-3 h-3 text-gray-500" />
                            {category}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="flex gap-2">
              {!isTracking ? (
                <Button 
                  onClick={startTimer}
                  disabled={!selectedClient || !workCategory}
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
        )}

        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today's Time Entries
          </h4>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {getTodaysEntries().length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-2">No time entries today</p>
            ) : (
              getTodaysEntries().map((entry) => {
                const client = clients.find(c => c.id === entry.client_id);
                const isRunningEntry = currentTimer && entry.id === currentTimer.id;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: client?.color || '#0073EA' }}
                      />
                      <span className="font-medium truncate max-w-48">
                        {client?.name} - {entry.work_category || entry.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>
                        {isRunningEntry
                          ? formatLiveTime(elapsedTime)
                          : formatLiveTime(Math.round((entry.duration_minutes || 0) * 60))
                        }
                      </span>
                      {entry.billable && (
                        <Badge className="text-xs bg-green-100 text-green-800 px-1 py-0">
                          $
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
