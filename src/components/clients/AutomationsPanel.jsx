
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea }
  from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Zap,
  Clock,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  AtSign // Added for recipient display
} from "lucide-react";
import { Client } from "@/api/entities";

const AUTOMATION_TRIGGERS = [
  { id: 'task_created', label: 'When a task is created', icon: Plus },
  { id: 'task_completed', label: 'When a task is completed', icon: CheckCircle2 },
  { id: 'task_overdue', label: 'When a task becomes overdue', icon: AlertTriangle },
  { id: 'weekly_summary', label: 'Weekly summary (Mondays)', icon: Calendar },
  { id: 'monthly_report', label: 'Monthly report (1st of month)', icon: Calendar },
];

const AUTOMATION_ACTIONS = [
  { id: 'send_email', label: 'Send email notification', icon: Mail },
  { id: 'send_slack', label: 'Send Slack message', icon: MessageSquare },
  { id: 'create_task', label: 'Create a new task', icon: Plus },
  { id: 'update_status', label: 'Update task status', icon: Settings },
];

export default function AutomationsPanel({ client, onClientUpdate }) {
  const [automations, setAutomations] = useState(client?.automations || []);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger: '',
    action: '',
    enabled: true,
    settings: {}
  });

  const handleCreateAutomation = () => {
    setIsCreating(true);
    setNewAutomation({
      name: '',
      trigger: '',
      action: '',
      enabled: true,
      settings: {}
    });
  };

  const handleSaveAutomation = async () => {
    if (!newAutomation.name || !newAutomation.trigger || !newAutomation.action) {
      alert('Please fill in all required fields');
      return;
    }

    // Additional validation for email recipient
    if (newAutomation.action === 'send_email' && !newAutomation.settings.recipientEmail) {
        alert('Please provide a recipient email for email automations.');
        return;
    }

    const automation = {
      id: Date.now().toString(),
      ...newAutomation,
      created_at: new Date().toISOString()
    };

    const updatedAutomations = [...automations, automation];
    setAutomations(updatedAutomations);
    setIsCreating(false);
    
    await saveAutomations(updatedAutomations);
  };

  const handleDeleteAutomation = async (automationId) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) return;
    
    const updatedAutomations = automations.filter(a => a.id !== automationId);
    setAutomations(updatedAutomations);
    await saveAutomations(updatedAutomations);
  };

  const handleToggleAutomation = async (automationId, enabled) => {
    const updatedAutomations = automations.map(a => 
      a.id === automationId ? { ...a, enabled } : a
    );
    setAutomations(updatedAutomations);
    await saveAutomations(updatedAutomations);
  };

  const saveAutomations = async (automationsList) => {
    setIsSaving(true);
    try {
      await Client.update(client.id, { automations: automationsList });
      onClientUpdate({ automations: automationsList });
    } catch (error) {
      console.error('Error saving automations:', error);
      alert('Failed to save automations');
    }
    setIsSaving(false);
  };

  const handleSetupTemplate = async (templateType) => {
    // Check for duplicates based on a template identifier
    const existingAutomation = automations.find(a => a.templateId === templateType);
    if (existingAutomation) {
      alert(`An automation based on the "${existingAutomation.name}" template already exists.`);
      return;
    }

    let newAutomationTemplate;

    switch (templateType) {
      case 'weekly_email':
        newAutomationTemplate = {
          id: Date.now().toString(),
          templateId: 'weekly_email',
          name: 'Weekly Status Email',
          trigger: 'weekly_summary',
          action: 'send_email',
          enabled: true,
          created_at: new Date().toISOString(),
          settings: {
            // Default to assignee, fallback to primary contact
            recipientEmail: client.default_assignee_email || client.email || '',
            emailTemplate: `Hi team,\n\nHere is the weekly summary for ${client.name}:\n\n- Completed Tasks: {{completed_tasks_list}}\n- Upcoming Tasks: {{upcoming_tasks_list}}\n\nBest,\nYour Automated Assistant`
          }
        };
        break;

      case 'overdue_alert':
        newAutomationTemplate = {
          id: Date.now().toString(),
          templateId: 'overdue_alert',
          name: 'Overdue Task Alert',
          trigger: 'task_overdue',
          action: 'send_email',
          enabled: true,
          created_at: new Date().toISOString(),
          settings: {
            // Default to assignee, fallback to primary contact
            recipientEmail: client.default_assignee_email || client.email || '',
            emailTemplate: `ALERT: The following task for ${client.name} is now overdue:\n\nTask: {{task_title}}\nDue Date: {{task_due_date}}\n\nPlease review.`
          }
        };
        break;

      case 'slack_updates':
        if (!client?.slack_channels?.length) {
            alert('Please configure at least one Slack channel in the Client Settings before setting up Slack integration.');
            return;
        }
        newAutomationTemplate = {
          id: Date.now().toString(),
          templateId: 'slack_updates',
          name: 'Post Task Completions to Slack',
          trigger: 'task_completed',
          action: 'send_slack',
          enabled: true,
          created_at: new Date().toISOString(),
          settings: {
            slackChannel: client.slack_channels[0] // Default to the first channel
          }
        };
        break;
      
      case 'monthly_report':
        newAutomationTemplate = {
          id: Date.now().toString(),
          templateId: 'monthly_report',
          name: 'Monthly Progress Report',
          trigger: 'monthly_report',
          action: 'send_email',
          enabled: true,
          created_at: new Date().toISOString(),
          settings: {
            // Default to client's primary email for reports
            recipientEmail: client.email || '',
            emailTemplate: `Hi ${client.name},\n\nHere is your progress report for the past month.\n\n- Total Tasks Completed: {{total_tasks_completed}}\n- Time Logged: {{total_time_logged}}\n\nWe look forward to another productive month!\n\nBest regards.`
          }
        };
        break;
      
      default:
        return;
    }

    const updatedAutomations = [...automations, newAutomationTemplate];
    setAutomations(updatedAutomations);
    await saveAutomations(updatedAutomations);
  };

  const getTriggerIcon = (triggerId) => {
    const trigger = AUTOMATION_TRIGGERS.find(t => t.id === triggerId);
    return trigger?.icon || Settings;
  };

  const getActionIcon = (actionId) => {
    const action = AUTOMATION_ACTIONS.find(a => a.id === actionId);
    return action?.icon || Settings;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Client Automations
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set up automated workflows for this client
              </p>
            </div>
            <Button onClick={handleCreateAutomation} className="bg-[#0073EA] hover:bg-[#0056B3]">
              <Plus className="w-4 h-4 mr-2" />
              Add Automation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {automations.length === 0 && !isCreating ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No automations yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first automation to streamline workflows for {client?.name}
              </p>
              <Button onClick={handleCreateAutomation} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First Automation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Existing Automations */}
              {automations.map(automation => {
                const TriggerIcon = getTriggerIcon(automation.trigger);
                const ActionIcon = getActionIcon(automation.action);
                
                return (
                  <div
                    key={automation.id}
                    className={`p-4 border rounded-lg ${automation.enabled ? 'bg-white' : 'bg-gray-50 opacity-75'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={(enabled) => handleToggleAutomation(automation.id, enabled)}
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{automation.name}</h4>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-2">
                              <TriggerIcon className="w-4 h-4" />
                              <span>{AUTOMATION_TRIGGERS.find(t => t.id === automation.trigger)?.label}</span>
                            </div>
                            <span>→</span>
                            <div className="flex items-center gap-2">
                              <ActionIcon className="w-4 h-4" />
                              <span>{AUTOMATION_ACTIONS.find(a => a.id === automation.action)?.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={automation.enabled ? "default" : "secondary"}>
                          {automation.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAutomation(automation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Show recipient for email actions */}
                    {automation.action === 'send_email' && automation.settings?.recipientEmail && (
                      <div className="mt-2 pl-10 flex items-center gap-2 text-xs text-gray-500">
                        <AtSign className="w-3 h-3" />
                        <span>Sends to:</span>
                        <span className="font-medium text-gray-700">{automation.settings.recipientEmail}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* New Automation Form */}
              {isCreating && (
                <div className="p-4 border-2 border-dashed border-[#0073EA] rounded-lg bg-blue-50">
                  <h4 className="font-medium text-gray-900 mb-4">Create New Automation</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="automation-name">Automation Name</Label>
                      <Input
                        id="automation-name"
                        value={newAutomation.name}
                        onChange={(e) => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Weekly status email"
                        className="bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>When this happens (Trigger)</Label>
                        <Select
                          value={newAutomation.trigger}
                          onValueChange={(value) => setNewAutomation(prev => ({ ...prev, trigger: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select trigger..." />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTOMATION_TRIGGERS.map(trigger => (
                              <SelectItem key={trigger.id} value={trigger.id}>
                                <div className="flex items-center gap-2">
                                  <trigger.icon className="w-4 h-4" />
                                  {trigger.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Do this (Action)</Label>
                        <Select
                          value={newAutomation.action}
                          onValueChange={(value) => setNewAutomation(prev => ({ ...prev, action: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select action..." />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTOMATION_ACTIONS.map(action => (
                              <SelectItem key={action.id} value={action.id}>
                                <div className="flex items-center gap-2">
                                  <action.icon className="w-4 h-4" />
                                  {action.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Action-specific settings */}
                    {newAutomation.action === 'send_email' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="recipient-email">Recipient Email</Label>
                          <Input
                            id="recipient-email"
                            type="email"
                            value={newAutomation.settings.recipientEmail || ''}
                            onChange={(e) => setNewAutomation(prev => ({
                              ...prev,
                              settings: { ...prev.settings, recipientEmail: e.target.value }
                            }))}
                            placeholder="e.g., project.manager@example.com"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-template">Email Template</Label>
                          <Textarea
                            id="email-template"
                            value={newAutomation.settings.emailTemplate || ''}
                            onChange={(e) => setNewAutomation(prev => ({
                              ...prev,
                              settings: { ...prev.settings, emailTemplate: e.target.value }
                            }))}
                            placeholder="Enter email template..."
                            className="bg-white h-24"
                          />
                        </div>
                      </div>
                    )}

                    {newAutomation.action === 'send_slack' && (
                      <div>
                        <Label>Slack Channel</Label>
                        <Select
                          value={newAutomation.settings.slackChannel || ''}
                          onValueChange={(value) => setNewAutomation(prev => ({
                            ...prev,
                            settings: { ...prev.settings, slackChannel: value }
                          }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select channel..." />
                          </SelectTrigger>
                          <SelectContent>
                            {client?.slack_channels?.map(channel => (
                              <SelectItem key={channel} value={channel}>
                                #{channel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreating(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveAutomation}
                        disabled={isSaving}
                        className="bg-[#0073EA] hover:bg-[#0056B3]"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Create Automation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Setup Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup Templates</CardTitle>
          <p className="text-sm text-gray-600">
            Common automation patterns you can set up with one click
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSetupTemplate('weekly_email')}
            >
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Weekly Status Email</h4>
              </div>
              <p className="text-sm text-gray-600">
                Send a weekly summary of completed tasks and upcoming deadlines
              </p>
            </div>

            <div 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSetupTemplate('overdue_alert')}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-medium">Overdue Task Alerts</h4>
              </div>
              <p className="text-sm text-gray-600">
                Get notified immediately when tasks become overdue
              </p>
            </div>

            <div 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSetupTemplate('slack_updates')}
            >
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">Slack Integration</h4>
              </div>
              <p className="text-sm text-gray-600">
                Post task updates and completions to Slack channels
              </p>
            </div>

            <div 
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSetupTemplate('monthly_report')}
            >
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">Monthly Reports</h4>
              </div>
              <p className="text-sm text-gray-600">
                Generate and send monthly progress reports automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
