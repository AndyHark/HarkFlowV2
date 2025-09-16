
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  Calendar,
  Target,
  MessageSquare,
  FileText,
  DollarSign,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

// Define the standard columns as per the outline, these will be used for all client boards
const defaultClientTemplateColumns = [
  {
    id: 'task',
    title: 'Task',
    type: 'text',
    width: 300,
  },
  {
    id: 'assignee',
    title: 'Assignee',
    type: 'people',
    width: 150,
  },
  {
    id: 'due_date',
    title: 'Due Date',
    type: 'date',
    width: 150,
  },
  {
    id: 'priority',
    title: 'Priority',
    type: 'priority',
    width: 120,
    options: {
      choices: [
        { value: 'low', label: 'Low', color: '#787D80' },
        { value: 'medium', label: 'Medium', color: '#FFCB00' },
        { value: 'high', label: 'High', color: '#FDAB3D' },
        { value: 'critical', label: 'Critical', color: '#E2445C' },
      ],
    },
  },
  {
    id: 'status',
    title: 'Status',
    type: 'status',
    width: 150,
    options: {
      choices: [
        { label: 'Not Started', color: '#C4C4C4' },
        { label: 'Working on it', color: '#FFCB00' },
        { label: 'Done', color: '#00C875' },
        { label: 'Stuck', color: '#E2445C' },
      ],
      default_value: 'Not Started',
    },
  },
];


const clientTemplates = [
  {
    id: 'marketing-agency',
    title: 'Marketing Agency Client',
    description: 'Perfect for marketing campaigns and client deliverables',
    icon: Target,
    color: '#FF6B6B',
    visibility: 'private', // Added from outline
    view_type: 'table', // Added from outline
    columns: defaultClientTemplateColumns, // Updated to use default columns
    // Removed groups property
  },
  {
    id: 'web-development',
    title: 'Web Development Client',
    description: 'Ideal for website and app development projects',
    icon: Briefcase,
    color: '#4ECDC4',
    visibility: 'private', // Added from outline
    view_type: 'table', // Added from outline
    columns: defaultClientTemplateColumns, // Updated to use default columns
    // Removed groups property
  },
  {
    id: 'consulting',
    title: 'Consulting Client',
    description: 'For professional services and consulting projects',
    icon: Users,
    color: '#45B7D1',
    visibility: 'private', // Added from outline
    view_type: 'table', // Added from outline
    columns: defaultClientTemplateColumns, // Updated to use default columns
    // Removed groups property
  }
];

export default function ClientBoardTemplate({ onSelect, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [clientName, setClientName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleCreateBoard = () => {
    if (!selectedTemplate || !clientName.trim()) return;

    const boardData = {
      title: `${clientName} - ${selectedTemplate.title}`,
      description: projectDescription,
      color: selectedTemplate.color,
      visibility: selectedTemplate.visibility, // Now sourced from template
      view_type: selectedTemplate.view_type,   // Now sourced from template
      columns: selectedTemplate.columns,
      // groups are no longer included from the template
    };

    onSelect(boardData);
  };

  return (
    <div className="space-y-6">
      {!selectedTemplate ? (
        <>
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-[#323338] mb-2">Choose a Client Board Template</h3>
            <p className="text-[#676879]">Select a template that matches your client project type</p>
          </div>

          <div className="grid gap-4">
            {clientTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: template.color + '20' }}
                      >
                        <template.icon
                          className="w-6 h-6"
                          style={{ color: template.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <p className="text-sm text-[#676879] mt-1">{template.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-[#323338] mb-2">Included Columns:</h5>
                        <div className="flex gap-1 flex-wrap">
                          {/* Displaying a subset of columns, as they are now standardized */}
                          {template.columns.slice(0, 4).map(col => (
                            <Badge key={col.id} variant="outline" className="text-xs">
                              {col.title}
                            </Badge>
                          ))}
                          {template.columns.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.columns.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Removed the "Workflow Groups" display section as groups are no longer part of templates */}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4 pb-4 border-b border-[#E1E5F3]">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: selectedTemplate.color + '20' }}
            >
              <selectedTemplate.icon
                className="w-6 h-6"
                style={{ color: selectedTemplate.color }}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#323338]">{selectedTemplate.title}</h3>
              <p className="text-[#676879]">{selectedTemplate.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#323338] mb-2 block">
                Client Name *
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="rounded-xl border-[#E1E5F3]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#323338] mb-2 block">
                Project Description
              </label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief description of the project goals and scope..."
                className="rounded-xl border-[#E1E5F3] min-h-20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedTemplate(null)}
              className="flex-1"
            >
              Back to Templates
            </Button>
            <Button
              onClick={handleCreateBoard}
              disabled={!clientName.trim()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Create Client Board
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
