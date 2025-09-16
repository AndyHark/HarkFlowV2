
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, CheckCircle2, AlertTriangle, Flag } from "lucide-react";
import { motion } from "framer-motion";

export default function TaskFilters({ filters, onChange, onClose, onClear }) {
  const handleStatusChange = (status, checked) => {
    const newStatuses = checked 
      ? [...filters.statuses, status]
      : filters.statuses.filter(s => s !== status);
    onChange({ ...filters, statuses: newStatuses });
  };

  const handlePriorityChange = (priority, checked) => {
    const newPriorities = checked
      ? [...filters.priorities, priority]
      : filters.priorities.filter(p => p !== priority);
    onChange({ ...filters, priorities: newPriorities });
  };

  const handleDueDateChange = (dueDateFilter, checked) => {
    const newDueDates = checked
      ? [...filters.dueDates, dueDateFilter]
      : filters.dueDates.filter(d => d !== dueDateFilter);
    onChange({ ...filters, dueDates: newDueDates });
  };

  const handleCompletionChange = (completionFilter, checked) => {
    const newCompletions = checked
      ? [...filters.completions, completionFilter]
      : filters.completions.filter(c => c !== completionFilter);
    onChange({ ...filters, completions: newCompletions });
  };

  const hasActiveFilters = filters.statuses.length > 0 || 
                          filters.priorities.length > 0 || 
                          filters.dueDates.length > 0 ||
                          filters.completions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 mt-2 z-50"
    >
      <Card className="w-96 shadow-lg border-[#E1E5F3]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-bold text-[#323338]">Filter Tasks</CardTitle>
          <button onClick={onClose} className="text-[#676879] hover:text-[#323338]">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Completion Status Filter */}
          <div>
            <h4 className="font-medium text-[#323338] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completion Status
            </h4>
            <div className="space-y-2">
              {[
                { value: 'incomplete', label: 'Active', color: 'blue' },
                { value: 'completed', label: 'Completed', color: 'green' },
              ].map((completion) => (
                <div key={completion.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`completion-${completion.value}`}
                    checked={filters.completions.includes(completion.value)}
                    onCheckedChange={(checked) => handleCompletionChange(completion.value, checked)}
                  />
                  <label 
                    htmlFor={`completion-${completion.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <div className={`w-3 h-3 rounded-full bg-${completion.color}-500`} />
                    <span>{completion.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Due Date Filter */}
          <div>
            <h4 className="font-medium text-[#323338] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </h4>
            <div className="space-y-2">
              {[
                { value: 'overdue', label: 'Overdue', color: 'red' },
                { value: 'today', label: 'Due Today', color: 'orange' },
                { value: 'this_week', label: 'Due This Week', color: 'yellow' },
                { value: 'no_due_date', label: 'No Due Date', color: 'gray' }
              ].map((dueDate) => (
                <div key={dueDate.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`due-${dueDate.value}`}
                    checked={filters.dueDates.includes(dueDate.value)}
                    onCheckedChange={(checked) => handleDueDateChange(dueDate.value, checked)}
                  />
                  <label 
                    htmlFor={`due-${dueDate.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    {dueDate.value === 'overdue' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    <span>{dueDate.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="font-medium text-[#323338] mb-3">Status</h4>
            <div className="space-y-2">
              {[
                { value: 'Not Started', label: 'Not Started', color: '#C4C4C4' },
                { value: 'In Progress', label: 'In Progress', color: '#FFCB00' },
                { value: 'Done', label: 'Done', color: '#00C875' },
                { value: 'Blocked', label: 'Blocked', color: '#E2445C' }
              ].map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
                    onCheckedChange={(checked) => handleStatusChange(status.value, checked)}
                  />
                  <label 
                    htmlFor={`status-${status.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span>{status.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <h4 className="font-medium text-[#323338] mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Priority
            </h4>
            <div className="space-y-2">
              {[
                { value: 'critical', label: 'Critical', color: '#E2445C' },
                { value: 'high', label: 'High', color: '#FDAB3D' },
                { value: 'medium', label: 'Medium', color: '#FFCB00' },
                { value: 'low', label: 'Low', color: '#787D80' }
              ].map((priority) => (
                <div key={priority.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority.value}`}
                    checked={filters.priorities.includes(priority.value)}
                    onCheckedChange={(checked) => handlePriorityChange(priority.value, checked)}
                  />
                  <label 
                    htmlFor={`priority-${priority.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: priority.color }}
                    />
                    <span>{priority.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-[#E1E5F3] flex justify-between">
              <button
                onClick={onClear}
                className="text-sm text-[#E2445C] hover:underline"
              >
                Clear all filters
              </button>
              <Badge variant="outline" className="text-xs">
                {filters.statuses.length + filters.priorities.length + filters.dueDates.length + filters.completions.length} active
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
