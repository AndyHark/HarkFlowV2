
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { TimeEntry } from "@/api/entities";
import { Client } from "@/api/entities";
import { ClientRetainer } from "@/api/entities";
import { MonthlyReport } from "@/api/entities";
import { User } from "@/api/entities";
import { Item } from "@/api/entities";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from "date-fns";

import TaskTimeTracker from "../components/time/TaskTimeTracker";
import TimeEntriesView from "../components/time/TimeEntriesView"; // New import

export default function TimeTrackingPage() {
  const navigate = useNavigate();
  const [timeEntries, setTimeEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedClient, setSelectedClient] = useState('all');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]); // State for all users (for admin filter)
  const [selectedUser, setSelectedUser] = useState('me'); // Default to 'me'
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      let allTimeEntriesForUser; // This will hold entries specifically for checking the running timer of the *current user*

      if (currentUser.role === 'admin' || (currentUser.custom_role || currentUser.role) === 'ANGE') {
        // Admin or ANGE sees all data
        const [clientsData, timeEntriesData, retainersData, reportsData, itemsData, usersData] = await Promise.all([
          Client.list('-updated_date'),
          TimeEntry.list('-start_time'), // Fetch all time entries
          ClientRetainer.list('-created_date'),
          MonthlyReport.list('-month'),
          Item.list(),
          User.list() // Fetch all users for the filter
        ]);

        setClients(clientsData);
        setTimeEntries(timeEntriesData); // Set all time entries to state for admin
        setRetainers(retainersData);
        setMonthlyReports(reportsData);
        setItems(itemsData);
        setUsers(usersData); // Set the users state
        allTimeEntriesForUser = timeEntriesData.filter(e => e.user_email === currentUser.email); // Filter to find current user's running timer
      } else {
        // Subcontractors/Contractors see their data + ALL clients for timer selection
        const [clientsData, timeEntriesData, itemsData] = await Promise.all([
          Client.list('-updated_date'), // Load ALL clients so they can track time for any client
          TimeEntry.filter({ user_email: currentUser.email }, '-start_time'), // Only fetch their own time entries
          Item.list()
        ]);

        setClients(clientsData);
        setTimeEntries(timeEntriesData); // Set only their time entries to state
        setItems(itemsData);
        setRetainers([]); // Subcontractors don't manage retainers
        setMonthlyReports([]); // Subcontractors don't see monthly reports
        allTimeEntriesForUser = timeEntriesData; // Their time entries are already filtered to them
      }
      
      const runningTimer = allTimeEntriesForUser.find(entry => entry.is_running);
      setCurrentTimer(runningTimer || null);

    } catch (error) {
      console.error('Error loading time tracking data:', error);
    }
    setIsLoading(false);
  };
  
  const handleTimerUpdate = (timerData) => {
    setCurrentTimer(timerData);
    loadData(); // Reload all data to keep everything in sync
  };

  const generateAutomatedReports = async () => {
    const userRole = user?.custom_role || user?.role;
    if (user?.role !== 'admin' && userRole !== 'ANGE') return;

    setIsGenerating(true);
    try {
      const now = new Date();
      const currentMonth = format(now, 'yyyy-MM');

      for (const client of clients) {
        const clientRetainer = retainers.find(r => r.client_id === client.id && r.is_active);
        if (!clientRetainer) continue;

        // Check if report already exists for this month
        const existingReport = monthlyReports.find(r =>
          r.client_id === client.id && r.month === currentMonth
        );
        if (existingReport) continue;

        // Calculate usage for this client this month
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // All time is considered billable
        const clientEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entry.client_id === client.id &&
                 entryDate >= monthStart &&
                 entryDate <= monthEnd &&
                 (entry.duration_minutes || 0) > 0; // Only count entries with duration
        });

        const totalMinutes = clientEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
        const usedHours = totalMinutes / 60;
        const retainerHours = clientRetainer.monthly_hours;
        const remainingHours = Math.max(0, retainerHours - usedHours);
        const overageHours = Math.max(0, usedHours - retainerHours);

        const retainerCost = retainerHours * clientRetainer.hourly_rate;
        const overageCost = overageHours * (clientRetainer.overage_rate || clientRetainer.hourly_rate);
        const totalCost = retainerCost + overageCost;

        const reportData = {
          client_id: client.id,
          month: currentMonth,
          retainer_hours: retainerHours,
          used_hours: parseFloat(usedHours.toFixed(2)),
          remaining_hours: parseFloat(remainingHours.toFixed(2)),
          overage_hours: parseFloat(overageHours.toFixed(2)),
          retainer_cost: parseFloat(retainerCost.toFixed(2)),
          overage_cost: parseFloat(overageCost.toFixed(2)),
          total_cost: parseFloat(totalCost.toFixed(2)),
          time_entries: clientEntries.map(e => e.id),
          status: 'draft',
          generated_at: new Date().toISOString()
        };

        await MonthlyReport.create(reportData);
      }

      // Reload data to show new reports
      await loadData();
    } catch (error) {
      console.error('Error generating reports:', error);
    }
    setIsGenerating(false);
  };

  const getFilteredEntries = () => {
    let filtered = timeEntries; // Start with the base timeEntries state

    // Determine if the current user is admin or ANGE
    const isAdminOrAnge = user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE';

    // Filter by user FIRST (only applicable for admin/ANGE, as non-admin/ANGE timeEntries are already filtered by loadData)
    if (isAdminOrAnge) {
      if (selectedUser !== 'all') { // If 'all' is selected, no user-specific filter is applied at this step.
        const userEmailToFilter = selectedUser === 'me' ? user.email : selectedUser;
        filtered = filtered.filter(entry => entry.user_email === userEmailToFilter);
      }
    } else {
      // For non-admin/ANGE, timeEntries state already contains only their data due to loadData fetching.
      // This line is a safeguard to ensure consistency, though largely redundant if loadData is correct.
      filtered = filtered.filter(entry => entry.user_email === user?.email);
    }

    // Filter by client
    if (selectedClient !== 'all') {
      filtered = filtered.filter(entry => entry.client_id === selectedClient);
    }

    // Filter by period
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case '7days':
        startDate = subDays(now, 7);
        endDate = now;
        break;
      default:
        // If 'default' (or any unhandled period), return the already filtered entries without a date filter.
        return filtered;
    }

    return filtered.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= startDate && entryDate <= endDate;
    });
  };

  const calculateStats = () => {
    const filteredEntries = getFilteredEntries();
    const totalMinutes = filteredEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    // All time is now considered billable, so no separate billableMinutes
    const totalRevenue = filteredEntries.reduce((sum, entry) => {
      const hours = (entry.duration_minutes || 0) / 60;
      return sum + (hours * (entry.hourly_rate || 75));
    }, 0);

    return {
      totalHours: totalMinutes / 60,
      revenue: totalRevenue,
      entries: filteredEntries.length
    };
  };

  const getRetainerStatus = () => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    return clients.map(client => {
      const clientRetainer = retainers.find(r => r.client_id === client.id && r.is_active);
      if (!clientRetainer) return null;

      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // All time is considered billable
      const clientEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entry.client_id === client.id &&
               entryDate >= monthStart &&
               entryDate <= monthEnd;
      });

      const totalMinutes = clientEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const usedHours = totalMinutes / 60;
      const overageHours = Math.max(0, usedHours - clientRetainer.monthly_hours);
      const percentage = (usedHours / clientRetainer.monthly_hours) * 100;

      return {
        client,
        retainer: clientRetainer,
        usedHours,
        overageHours,
        percentage,
        status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'good'
      };
    }).filter(Boolean);
  };

  const stats = calculateStats();
  const retainerStatuses = (user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') ? getRetainerStatus() : [];

  const retainerAlertsCount = retainerStatuses.filter(
    s => s.status === 'warning' || s.status === 'over'
  ).length;

  const warningClients = retainerStatuses.filter(s => s.status === 'warning');
  const overClients = retainerStatuses.filter(s => s.status === 'over');

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">Time Tracking</h1>
            <p className="text-[#676879] mt-2">
              {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE')
                ? 'Track time, manage retainers, and monitor client usage'
                : 'Track your work hours and view your time entries'
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white rounded-xl p-4 shadow-sm border border-[#E1E5F3]">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') && (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">My Hours</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') && (
              <TabsTrigger value="retainers" className="relative">
                Retainer Status
                {retainerAlertsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white">
                    {retainerAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {user?.role === 'admin' && user?.custom_role !== 'ANGE' && (
              <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
            )}
            <TabsTrigger value="tracker">Time Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#323338]">{formatHours(stats.totalHours)}</p>
                      <p className="text-sm text-[#676879]">
                        {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') ? 'Total Hours' : 'Your Hours'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#323338]">{formatMoney(stats.revenue)}</p>
                          <p className="text-sm text-[#676879]">Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[#323338]">{clients.length}</p>
                          <p className="text-sm text-[#676879]">Active Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Time Entries View */}
            <TimeEntriesView
              timeEntries={getFilteredEntries()} // Pass filtered entries
              clients={clients}
              user={user}
              currentTimer={currentTimer}
              onTimerUpdate={handleTimerUpdate}
            />
          </TabsContent>

          {(user?.role === 'admin' || (user?.custom_role || user?.role) === 'ANGE') && (
            <TabsContent value="retainers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Retainer Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {warningClients.length === 0 && overClients.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        All client retainers are within their limits.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {overClients.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-red-600 mb-2">Over Limit</h4>
                            {overClients.map(status => (
                              <div key={status.client.id} className="p-3 bg-red-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{status.client.name}</span>
                                  <span className="text-sm text-red-700 ml-2">({status.percentage.toFixed(0)}% used)</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/ClientDetail?id=${status.client.id}`)}>
                                  View
                                  <ExternalLink className="w-3 h-3 ml-1.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {warningClients.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-orange-500 mb-2">Approaching Limit</h4>
                             {warningClients.map(status => (
                              <div key={status.client.id} className="p-3 bg-orange-50 rounded-lg flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{status.client.name}</span>
                                  <span className="text-sm text-orange-700 ml-2">({status.percentage.toFixed(0)}% used)</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/ClientDetail?id=${status.client.id}`)}>
                                  View
                                  <ExternalLink className="w-3 h-3 ml-1.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Client Retainers - {format(new Date(), 'MMMM yyyy')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {retainerStatuses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No active retainers found</p>
                        </div>
                      ) : (
                        retainerStatuses.map((status, index) => (
                          <motion.div
                            key={status.client.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-lg border-l-4 ${
                              status.status === 'over' ? 'bg-red-50 border-red-500' :
                              status.status === 'warning' ? 'bg-orange-50 border-orange-500' :
                              'bg-green-50 border-green-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-[#323338]">{status.client.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-[#676879] mt-1">
                                  <span>{formatHours(status.usedHours)} / {formatHours(status.retainer.monthly_hours)} used</span>
                                  <span>•</span>
                                  <span>{formatMoney(status.retainer.hourly_rate)}/hr</span>
                                  {status.overageHours > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-red-600">{formatHours(status.overageHours)} overage</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  className={
                                    status.status === 'over' ? 'bg-red-100 text-red-800' :
                                    status.status === 'warning' ? 'bg-orange-100 text-orange-800' :
                                    'bg-green-100 text-green-800'
                                  }
                                >
                                  {status.percentage.toFixed(0)}% Used
                                </Badge>
                                {status.overageHours > 0 && (
                                  <p className="text-sm text-red-600 mt-1">
                                    +{formatMoney(status.overageHours * (status.retainer.overage_rate || status.retainer.hourly_rate))}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>
          )}

          {user?.role === 'admin' && user?.custom_role !== 'ANGE' && (
            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No monthly reports generated yet.</p>
                        <p>Click "Generate Monthly Reports" in the Analytics page to create them.</p>
                      </div>
                    ) : (
                      monthlyReports.map((report, index) => {
                        const client = clients.find(c => c.id === report.client_id);
                        return (
                          <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">
                                    {client?.name} - {format(new Date(report.month + '-01'), 'MMMM yyyy')}
                                  </h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                    <span>{formatHours(report.used_hours)} used</span>
                                    <span>•</span>
                                    <span>{formatHours(report.overage_hours)} overage</span>
                                    <span>•</span>
                                    <span>{formatMoney(report.total_cost)} total</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      report.status === 'paid' ? 'default' :
                                      report.status === 'sent' ? 'secondary' : 'outline'
                                    }
                                  >
                                    {report.status}
                                  </Badge>
                                  <Button variant="ghost" size="icon">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="tracker">
            <TaskTimeTracker 
              clients={clients}
              tasks={items}
              user={user}
              currentTimer={currentTimer}
              onTimerUpdate={handleTimerUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
