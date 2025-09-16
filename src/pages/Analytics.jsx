
import React, { useState, useEffect } from "react";
import { Board } from "@/api/entities";
import { Item } from "@/api/entities";
import { TimeEntry } from "@/api/entities";
import { User } from "@/api/entities";
import { Client } from "@/api/entities";
import { ClientRetainer } from "@/api/entities";
import { MonthlyReport } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BarChart3, TrendingUp, Users, Calendar, Target, Clock, Folder, Activity, CheckCircle2, DollarSign, X, FileText, FileSignature } from "lucide-react";
import { format, differenceInDays, subDays, subMonths, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { motion } from "framer-motion";
import { generateInvoicingTasks as generateInvoicingTasksFunction } from "@/api/functions";

export default function AnalyticsPage() {
  const [boards, setBoards] = useState([]);
  const [items, setItems] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState(null);
  const [showSubcontractorDetails, setShowSubcontractorDetails] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        boardsData, 
        itemsData, 
        timeEntriesData, 
        usersData,
        clientsData,
        retainersData,
        reportsData,
        user
      ] = await Promise.all([
        Board.list("-updated_date"),
        Item.list("-updated_date"),
        TimeEntry.list("-updated_date"),
        User.list(),
        Client.list("-updated_date"),
        ClientRetainer.list("-updated_date"),
        MonthlyReport.list("-month"),
        User.me()
      ]);
      setBoards(boardsData);
      setItems(itemsData);
      setTimeEntries(timeEntriesData);
      setUsers(usersData);
      setClients(clientsData);
      setRetainers(retainersData);
      setMonthlyReports(reportsData);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    }
    setIsLoading(false);
  };

  const handleGenerateInvoicingTasks = async () => {
    // Check if default assignee is set first
    if (!currentUser?.default_invoicing_assignee_email) {
      alert('Please set a default invoicing assignee in Settings before generating invoicing tasks.');
      return;
    }

    setIsInvoicing(true);
    try {
      const lastMonth = subMonths(new Date(), 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1; // getMonth is 0-indexed

      const response = await generateInvoicingTasksFunction({ year, month });
      
      if (response?.data?.success) {
        alert(response.data.message);
      } else {
        throw new Error(response?.data?.error || "An unknown error occurred.");
      }
    } catch (error) {
      console.error('Error generating invoicing tasks:', error);
      if (error.message.includes('No default invoicing assignee')) {
        alert('Please set a default invoicing assignee in Settings before generating invoicing tasks.');
      } else {
        alert(`Failed to generate invoicing tasks: ${error.message}`);
      }
    }
    setIsInvoicing(false);
  };

  const generateAutomatedReports = async () => {
    const userRole = currentUser?.custom_role || currentUser?.role;
    if (currentUser?.role !== 'admin' && userRole !== 'ANGE') return;

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

  // Filter data based on selections
  const getFilteredData = () => {
    const daysAgo = parseInt(selectedTimeRange);
    const cutoffDate = subDays(new Date(), daysAgo);

    const filteredEntries = timeEntries.filter(entry => {
      if (selectedBoard !== 'all' && entry.board_id !== selectedBoard) {
        return false;
      }
      return isAfter(new Date(entry.start_time), cutoffDate);
    });
    
    const filteredItems = items.filter(item => {
      if (selectedBoard !== 'all' && item.board_id !== selectedBoard) {
        return false;
      }
      return isAfter(new Date(item.updated_date), cutoffDate);
    });

    return { filteredEntries, filteredItems };
  }

  const { filteredEntries, filteredItems } = getFilteredData();

  const filteredBoards = selectedBoard === 'all' ? boards : boards.filter(b => b.id === selectedBoard);

  // Calculate analytics
  const totalTasks = filteredItems.length;
  const completedTasks = filteredItems.filter(item => {
    const statusColumn = boards.find(b => b.id === item.board_id)?.columns?.find(col => col.type === 'status');
    return item.data?.[statusColumn?.id] === 'Done';
  }).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overdue tasks
  const overdueTasks = filteredItems.filter(item => {
    const board = boards.find(b => b.id === item.board_id);
    const dueDateColumn = board?.columns?.find(col => col.type === 'date');
    const statusColumn = board?.columns?.find(col => col.type === 'status');
    
    const dueDate = item.data?.[dueDateColumn?.id];
    const status = item.data?.[statusColumn?.id];
    
    if (!dueDate || status === 'Done') return false;
    return isBefore(new Date(dueDate), new Date());
  }).length;

  // Board performance
  const boardStats = filteredBoards.map(board => {
    const boardItems = filteredItems.filter(item => item.board_id === board.id);
    const statusColumn = board.columns?.find(col => col.type === 'status');
    const completed = boardItems.filter(item => item.data?.[statusColumn?.id] === 'Done').length;
    const total = boardItems.length;
    
    return {
      ...board,
      totalTasks: total,
      completedTasks: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  const calculateSubcontractorStats = () => {
    const stats = {};
    filteredEntries.forEach(entry => {
      if (!stats[entry.user_email]) {
        const user = users.find(u => u.email === entry.user_email);
        stats[entry.user_email] = {
          userEmail: entry.user_email,
          userName: user ? user.full_name : entry.user_name,
          totalHours: 0,
          totalCost: 0,
        };
      }
      const hours = (entry.duration_minutes || 0) / 60;
      stats[entry.user_email].totalHours += hours;
      // Use the rate from the time entry for historical accuracy
      stats[entry.user_email].totalCost += hours * (entry.hourly_rate || 0);
    });
    return Object.values(stats).sort((a, b) => b.totalCost - a.totalCost);
  };
  
  const subcontractorStats = calculateSubcontractorStats();

  const calculateSubcontractorClientBreakdown = (userEmail) => {
    const clientStats = {};
    
    const userEntries = filteredEntries.filter(entry => entry.user_email === userEmail);
    
    userEntries.forEach(entry => {
      if (!clientStats[entry.client_id]) {
        const client = clients.find(c => c.id === entry.client_id);
        const retainer = retainers.find(r => r.client_id === entry.client_id && r.is_active);
        const monthlyValue = retainer ? (retainer.monthly_hours || 0) * (retainer.hourly_rate || 0) : 0;
        
        clientStats[entry.client_id] = {
          clientId: entry.client_id,
          clientName: client ? client.name : 'Unknown Client',
          clientColor: client ? client.color : '#0073EA',
          totalHours: 0,
          totalCost: 0,
          monthlyValue: monthlyValue,
          entries: []
        };
      }
      
      const hours = (entry.duration_minutes || 0) / 60;
      clientStats[entry.client_id].totalHours += hours;
      clientStats[entry.client_id].totalCost += hours * (entry.hourly_rate || 0);
      clientStats[entry.client_id].entries.push(entry);
    });
    
    return Object.values(clientStats).sort((a, b) => b.totalCost - a.totalCost);
  };

  const handleSubcontractorClick = (subcontractor) => {
    setSelectedSubcontractor(subcontractor);
    setShowSubcontractorDetails(true);
  };

  // Status distribution
  const statusDistribution = {};
  filteredItems.forEach(item => {
    const board = boards.find(b => b.id === item.board_id);
    const statusColumn = board?.columns?.find(col => col.type === 'status');
    const status = item.data?.[statusColumn?.id] || 'Not Started';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  // Priority distribution
  const priorityDistribution = {};
  filteredItems.forEach(item => {
    const board = boards.find(b => b.id === item.board_id);
    const priorityColumn = board?.columns?.find(col => col.type === 'priority');
    const priority = item.data?.[priorityColumn?.id] || 'Medium';
    priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
  });

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">Analytics Dashboard</h1>
            <p className="text-[#676879] mt-2">Insights and metrics across your boards and tasks</p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {(currentUser?.role === 'admin' || (currentUser?.custom_role || currentUser?.role) === 'ANGE') && (
              <>
                <Button
                  onClick={handleGenerateInvoicingTasks}
                  disabled={isInvoicing || isLoading}
                  variant="outline"
                  className="bg-white"
                >
                  <FileSignature className="w-4 h-4 mr-2" />
                  {isInvoicing ? 'Generating Invoices...' : 'Invoice Last Month'}
                </Button>
                <Button
                  onClick={generateAutomatedReports}
                  disabled={isGenerating || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Monthly Reports'}
                </Button>
              </>
            )}
            
            <Select value={selectedBoard} onValueChange={setSelectedBoard}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTasks}</div>
                <p className="text-blue-100 text-sm">Active tasks tracked</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completionRate}%</div>
                <Progress value={completionRate} className="mt-2 bg-green-300" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overdueTasks}</div>
                <p className="text-red-100 text-sm">Need attention</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Active Boards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredBoards.length}</div>
                <p className="text-purple-100 text-sm">Boards in use</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts and detailed analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(statusDistribution).map(([status, count]) => {
                  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  const color = getStatusColor(status);
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(priorityDistribution).map(([priority, count]) => {
                  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  const color = getPriorityColor(priority);
                  
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{priority}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Board Performance */}
        {selectedBoard === 'all' && (
          <Card>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                   <CardTitle className="flex items-center gap-2 m-0">
                      <BarChart3 className="w-5 h-5 text-green-500" />
                      Board Performance
                  </CardTitle>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                    <div className="space-y-4">
                      {boardStats.map((board, index) => (
                        <motion.div
                          key={board.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-lg"
                              style={{ backgroundColor: board.color || '#0073EA' }}
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{board.title}</h4>
                              <p className="text-sm text-gray-500">
                                {board.completedTasks} of {board.totalTasks} tasks completed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${board.completionRate}%` }}
                              />
                            </div>
                            <Badge variant="outline" className="min-w-[3rem] justify-center">
                              {board.completionRate}%
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        {/* Subcontractor Cost Report (Admin Only) */}
        {currentUser?.role === 'admin' && currentUser?.custom_role !== 'ANGE' && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-500" />
                Subcontractor Cost Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                 <div className="grid grid-cols-3 gap-4 font-semibold text-sm text-gray-500 px-4">
                    <div>Subcontractor</div>
                    <div className="text-right">Total Hours</div>
                    <div className="text-right">Total Cost</div>
                  </div>
                {subcontractorStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors items-center cursor-pointer"
                    onClick={() => handleSubcontractorClick(stat)}
                  >
                    <div className="font-medium text-gray-900 hover:text-blue-600">{stat.userName}</div>
                    <div className="text-right font-mono">{stat.totalHours.toFixed(2)}h</div>
                    <div className="text-right font-mono font-semibold">{formatMoney(stat.totalCost)}</div>
                  </motion.div>
                ))}
                {subcontractorStats.length === 0 && (
                   <div className="text-center py-8 text-gray-500">
                     No time entry data for the selected period.
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subcontractor Details Modal */}
      <Dialog open={showSubcontractorDetails} onOpenChange={setShowSubcontractorDetails}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              {selectedSubcontractor?.userName} - Client Breakdown
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubcontractor && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{selectedSubcontractor.totalHours.toFixed(2)}h</p>
                    <p className="text-sm text-gray-500">Total Hours</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(selectedSubcontractor.totalCost)}</p>
                    <p className="text-sm text-gray-500">Total Cost</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Hours & Profitability by Client</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-4 font-semibold text-sm text-gray-500 px-4 py-2 bg-gray-100 rounded-lg">
                    <div>Client</div>
                    <div className="text-right">Sub Hours</div>
                    <div className="text-right">Sub Cost</div>
                    <div className="text-right">Monthly Value</div>
                    <div className="text-right">Net Profit</div>
                  </div>
                  {calculateSubcontractorClientBreakdown(selectedSubcontractor.userEmail).map((clientStat, index) => {
                    const netValue = clientStat.monthlyValue - clientStat.totalCost;
                    return (
                      <motion.div
                        key={clientStat.clientId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="grid grid-cols-5 gap-4 p-3 bg-white rounded-lg border border-gray-200 items-center"
                      >
                        <div className="flex items-center gap-3 col-span-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: clientStat.clientColor }}
                          />
                          <span className="font-medium text-gray-900 truncate">{clientStat.clientName}</span>
                        </div>
                        <div className="text-right font-mono text-gray-700">{clientStat.totalHours.toFixed(2)}h</div>
                        <div className="text-right font-mono font-semibold text-gray-900">{formatMoney(clientStat.totalCost)}</div>
                        <div className="text-right font-mono text-gray-700">{formatMoney(clientStat.monthlyValue)}</div>
                        <div className={`text-right font-mono font-semibold ${netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMoney(netValue)}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed':
      return '#00C875';
    case 'working on it':
    case 'working':
    case 'in progress':
      return '#FFCB00';
    case 'stuck':
      return '#E2445C';
    default:
      return '#C4C4C4';
  }
}

function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'critical':
      return '#E2445C';
    case 'high':
      return '#FDAB3D';
    case 'medium':
      return '#FFCB00';
    case 'low':
      return '#787D80';
    default:
      return '#C4C4C4';
  }
}
