
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  DollarSign, 
  Play, 
  Pause, 
  MoreHorizontal,
  Calendar,
  Timer,
  Edit3,
  Trash2,
  Save,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { TimeEntry } from "@/api/entities";

export default function TimeEntriesView({ timeEntries, clients, user, currentTimer, onTimerUpdate }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Group time entries by date
  const groupedEntries = useMemo(() => {
    const now = new Date();
    let filteredEntries = timeEntries;

    // Filter by selected period
    if (selectedPeriod === 'week') {
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      filteredEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
    } else if (selectedPeriod === 'today') {
      filteredEntries = timeEntries.filter(entry => isToday(new Date(entry.start_time)));
    }

    const groups = {};
    
    filteredEntries.forEach(entry => {
      const entryDate = new Date(entry.start_time);
      let dateKey;
      
      if (isToday(entryDate)) {
        dateKey = 'Today';
      } else if (isYesterday(entryDate)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(entryDate, 'EEE, MMM d');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });

    // Sort entries within each group by start time (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    });

    return groups;
  }, [timeEntries, selectedPeriod]);

  // Calculate total time for the period
  const totalTime = useMemo(() => {
    const allEntries = Object.values(groupedEntries).flat();
    return allEntries.reduce((total, entry) => total + (entry.duration_minutes || 0), 0);
  }, [groupedEntries]);

  const formatTime = (minutes) => {
    if (!minutes) return '00:00:00';
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeRange = (startTime, endTime) => {
    if (!endTime) return `${format(new Date(startTime), 'HH:mm')} - Running`;
    return `${format(new Date(startTime), 'HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '00:00:00';
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getClient = (clientId) => {
    return clients.find(c => c.id === clientId);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;
    
    try {
      await TimeEntry.delete(entryId);
      // Trigger parent refresh
      if (onTimerUpdate) {
        onTimerUpdate(null);
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      start_time: format(new Date(entry.start_time), 'HH:mm'),
      end_time: entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : '',
      description: entry.description || ''
    });
  };

  const handleSaveEdit = async (entryId) => {
    try {
      const entry = timeEntries.find(e => e.id === entryId);
      if (!entry) return;

      const startDate = new Date(entry.start_time);
      const [startHours, startMinutes] = editForm.start_time.split(':');
      startDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

      let endDate = null;
      let duration_minutes = 0;

      if (editForm.end_time) {
        endDate = new Date(entry.start_time); // Same date
        const [endHours, endMinutes] = editForm.end_time.split(':');
        endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
        
        // Handle case where end time is next day
        if (endDate <= startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }
        
        duration_minutes = differenceInMinutes(endDate, startDate);
      }

      await TimeEntry.update(entryId, {
        start_time: startDate.toISOString(),
        end_time: endDate ? endDate.toISOString() : null,
        duration_minutes: duration_minutes,
        description: editForm.description,
        is_running: !endDate
      });

      setEditingEntry(null);
      setEditForm({});
      
      // Trigger parent refresh by calling onTimerUpdate with null to force reload
      if (onTimerUpdate) {
        onTimerUpdate(null);
      }
      
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({});
  };

  return (
    <div className="space-y-6">
      {/* Header with period selector and total */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Time Entries</h3>
          <p className="text-sm text-gray-600 mt-1">
            Total: {formatTime(totalTime)} ({selectedPeriod === 'week' ? 'this week' : 'today'})
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('today')}
            className="rounded-lg"
          >
            Today
          </Button>
          <Button
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('week')}
            className="rounded-lg"
          >
            This Week
          </Button>
        </div>
      </div>

      {/* Time Entries List */}
      <Card className="bg-white overflow-hidden border border-gray-200">
        <CardContent className="p-0">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No time entries found for the selected period.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {Object.entries(groupedEntries).map(([dateKey, entries]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{dateKey}</h4>
                      <span className="text-sm font-semibold text-gray-900">
                        Total: {formatTime(entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Entries for this date */}
                  <div className="divide-y divide-gray-200">
                    {entries.map((entry, index) => {
                      const client = getClient(entry.client_id);
                      const isRunning = entry.is_running;
                      const isEditing = editingEntry === entry.id;
                      
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                          {isEditing ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: client?.color || '#0073EA' }}
                                />
                                <Input
                                  value={editForm.description}
                                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                  className="flex-1"
                                  placeholder="Description"
                                />
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Start:</span>
                                  <Input
                                    type="time"
                                    value={editForm.start_time}
                                    onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                                    className="w-32"
                                  />
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">End:</span>
                                  <Input
                                    type="time"
                                    value={editForm.end_time}
                                    onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                                    className="w-32"
                                    placeholder="Running..."
                                  />
                                </div>
                                
                                <div className="flex gap-2 ml-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSaveEdit(entry.id)}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-center justify-between">
                              {/* Left side - Description and Client */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: client?.color || '#0073EA' }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-900 font-medium truncate">
                                      {entry.description || 'No description'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {client?.name || 'Unknown Client'}
                                      {entry.work_category && ` • ${entry.work_category}`}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Middle - Time range */}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{formatTimeRange(entry.start_time, entry.end_time)}</span>
                              </div>

                              {/* Right side - Duration, Billable indicator, Actions */}
                              <div className="flex items-center gap-4">
                                {entry.billable && (
                                  <DollarSign className="w-4 h-4 text-green-500" title="Billable" />
                                )}
                                
                                {isRunning ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-green-600 font-mono font-semibold">
                                      Running
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono font-semibold text-gray-900 min-w-[80px] text-right">
                                    {formatDuration(entry.duration_minutes)}
                                  </span>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white border-gray-200">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditEntry(entry)}
                                      className="text-gray-900 hover:text-blue-600 hover:bg-gray-50"
                                    >
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Edit Entry
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="text-red-500 hover:text-white hover:bg-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
