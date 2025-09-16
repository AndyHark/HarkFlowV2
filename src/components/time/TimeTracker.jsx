
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar,
  DollarSign,
  Timer,
  User,
  Tag,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TimeEntry } from "@/api/entities";
import { Client } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";
import { format, differenceInMinutes, startOfDay, endOfDay, differenceInSeconds } from "date-fns";

export default function TimeTracker({ board, onClose }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('development');
  const [billable, setBillable] = useState(true);
  const [timeEntries, setTimeEntries] = useState([]);
  const [client, setClient] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalTime, setTotalTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds

  const categories = [
    { value: 'development', label: 'Development', color: '#00C875' },
    { value: 'design', label: 'Design', color: '#A25DDC' },
    { value: 'meeting', label: 'Meeting', color: '#FFCB00' },
    { value: 'admin', label: 'Admin', color: '#676879' },
    { value: 'support', label: 'Support', color: '#E2445C' },
    { value: 'planning', label: 'Planning', color: '#0073EA' },
    { value: 'review', label: 'Review', color: '#FDAB3D' },
    { value: 'other', label: 'Other', color: '#787D80' }
  ];

  useEffect(() => {
    loadData();
  }, [board]);

  useEffect(() => {
    let interval;
    if (isTracking && currentEntry) {
      const start = new Date(currentEntry.start_time);
      // Initialize time immediately
      setElapsedTime(differenceInSeconds(new Date(), start));
      
      interval = setInterval(() => {
        // Recalculate from start time to avoid drift
        setElapsedTime(differenceInSeconds(new Date(), start));
      }, 1000);
    } else {
        setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentEntry]);

  useEffect(() => {
    loadTimeEntries();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      // Load client
      const clients = await Client.filter({ board_id: board.id });
      if (clients.length > 0) {
        setClient(clients[0]);
      }

      // Load current user
      const currentUser = await UserEntity.me();
      setUser(currentUser);

      // Check for running timer
      const runningEntries = await TimeEntry.filter({ 
        board_id: board.id, 
        is_running: true,
        user_email: currentUser.email 
      });
      
      if (runningEntries.length > 0) {
        const entry = runningEntries[0];
        setCurrentEntry(entry);
        setIsTracking(true);
        setDescription(entry.description);
        setCategory(entry.category);
        setBillable(entry.billable);
      }
    } catch (error) {
      console.error('Error loading time tracker data:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!client || !user) return;

    try {
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);
      
      const entries = await TimeEntry.filter({ 
        client_id: client.id,
        user_email: user.email
      }, '-start_time');
      
      // Filter by selected date
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      setTimeEntries(dayEntries);
      
      // Calculate total time for the day
      const total = dayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      setTotalTime(total);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const startTimer = async () => {
    if (!description.trim() || !client || !user) return;

    try {
      const entry = await TimeEntry.create({
        client_id: client.id,
        board_id: board.id,
        user_email: user.email,
        user_name: user.full_name,
        description: description.trim(),
        start_time: new Date().toISOString(),
        category,
        billable,
        is_running: true,
        hourly_rate: 75 // Default rate, should come from client retainer
      });

      setCurrentEntry(entry);
      setIsTracking(true);
      setElapsedTime(0);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date();
      const startTime = new Date(currentEntry.start_time);
      const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      await TimeEntry.update(currentEntry.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationInMinutes,
        is_running: false
      });

      setIsTracking(false);
      setCurrentEntry(null);
      setElapsedTime(0);
      setDescription('');
      loadTimeEntries();
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
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

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCategoryColor = (categoryValue) => {
    return categories.find(c => c.value === categoryValue)?.color || '#787D80';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Timer Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-blue-600" />
            Time Tracker
            {client && (
              <Badge variant="outline" className="ml-2">
                {client.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Timer Display */}
          {isTracking && (
            <div className="text-center py-6">
              <motion.div
                className="text-4xl font-mono font-bold text-blue-600 mb-2"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {formatLiveTime(elapsedTime)}
              </motion.div>
              <p className="text-gray-600">{description}</p>
              <Badge 
                className="mt-2"
                style={{ backgroundColor: getCategoryColor(category) + '20', color: getCategoryColor(category) }}
              >
                {categories.find(c => c.value === category)?.label}
              </Badge>
            </div>
          )}

          {/* Timer Controls */}
          <div className="space-y-3">
            {!isTracking && (
              <Textarea
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px]"
              />
            )}

            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory} disabled={isTracking}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={billable ? "default" : "outline"}
                onClick={() => setBillable(!billable)}
                disabled={isTracking}
                className="px-4"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                {billable ? 'Billable' : 'Non-billable'}
              </Button>
            </div>

            <div className="flex gap-2">
              {!isTracking ? (
                <Button 
                  onClick={startTimer}
                  disabled={!description.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Timer
                </Button>
              ) : (
                <Button 
                  onClick={stopTimer}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Summary - {format(selectedDate, 'MMM d, yyyy')}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{formatTime(totalTime)}</p>
                <p className="text-sm text-gray-500">Total Today</p>
              </div>
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No time entries for this date</p>
              </div>
            ) : (
              timeEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoryColor(entry.category) }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{entry.description}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{format(new Date(entry.start_time), 'HH:mm')}</span>
                        {entry.end_time && (
                          <>
                            <span>-</span>
                            <span>{format(new Date(entry.end_time), 'HH:mm')}</span>
                          </>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {categories.find(c => c.value === entry.category)?.label}
                        </Badge>
                        {entry.billable && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Billable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatLiveTime(Math.round((entry.duration_minutes || 0) * 60))}
                      </p>
                      {entry.billable && entry.hourly_rate && (
                        <p className="text-sm text-gray-500">
                          {formatMoney((entry.duration_minutes || 0) / 60 * entry.hourly_rate)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
