import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  User,
  Calendar,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const [activities] = useState([
    {
      id: 1,
      type: 'task_completed',
      title: 'Task completed: Website mockup review',
      client: 'Acme Corporation',
      user: 'You',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: CheckCircle2,
      color: '#00C875'
    },
    {
      id: 2,
      type: 'client_added',
      title: 'New client added: Creative Agency Pro',
      client: 'Creative Agency Pro',
      user: 'You',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      icon: Plus,
      color: '#0073EA'
    },
    {
      id: 3,
      type: 'task_updated',
      title: 'Task updated: Fleet tracking system design',
      client: 'Global Logistics Inc',
      user: 'You',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      icon: Edit3,
      color: '#FFCB00'
    },
    {
      id: 4,
      type: 'task_created',
      title: 'New task: Client onboarding documentation',
      client: 'Acme Corporation',
      user: 'You',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      icon: Plus,
      color: '#A25DDC'
    },
    {
      id: 5,
      type: 'task_overdue',
      title: 'Task overdue: Final proposal review',
      client: 'Creative Agency Pro',
      user: 'System',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      icon: Clock,
      color: '#E2445C'
    }
  ]);

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'task_completed':
        return 'Task Completed';
      case 'task_created':
        return 'Task Created';
      case 'task_updated':
        return 'Task Updated';
      case 'task_overdue':
        return 'Task Overdue';
      case 'client_added':
        return 'Client Added';
      default:
        return 'Activity';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-[#323338] flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-[#0073EA] hover:bg-[#0073EA]/10">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#F5F6F8] transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: activity.color + '20' }}
              >
                <activity.icon 
                  className="w-5 h-5" 
                  style={{ color: activity.color }} 
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: activity.color + '40',
                      color: activity.color 
                    }}
                  >
                    {getActivityTypeLabel(activity.type)}
                  </Badge>
                  <span className="text-xs text-[#676879]">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-[#323338] mb-1">
                  {activity.title}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-[#676879]">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{activity.user}</span>
                  </div>
                  <span>•</span>
                  <span>{activity.client}</span>
                </div>
              </div>
              
              <div className="text-xs text-[#676879] text-right">
                {format(activity.timestamp, 'MMM d, HH:mm')}
              </div>
            </motion.div>
          ))}
        </div>
        
        {activities.length === 0 && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-[#676879] text-sm">No recent activity</p>
            <p className="text-xs text-[#676879] mt-1">
              Activity will appear here as you work on projects
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}