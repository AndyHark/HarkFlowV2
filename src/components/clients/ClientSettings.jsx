
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch"; // New import for Switch component
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  User,
  MessageSquare,
  Clock,
  Pause,
  Archive,
  Trash2,
  Calendar as CalendarIcon,
  Save,
  AlertTriangle,
  Phone,
  Mail,
  Briefcase,
  X // New import for X icon
} from "lucide-react";
import { format } from "date-fns";
import { User as UserEntity } from "@/api/entities";
import { Client } from "@/api/entities";
import WorkCategoriesManager from './WorkCategoriesManager'; // Import the new component

export default function ClientSettings({ client, onClientUpdate }) {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    default_assignee_email: client?.default_assignee_email || '',
    default_assignee_name: client?.default_assignee_name || '',
    default_work_category: client?.work_categories?.[0] || '', // This is derived, not a direct savable field
    preferred_communication: client?.preferred_communication || 'email',
    primary_contact: client?.contact_person || '',
    secondary_contact: client?.secondary_contact || '',
    do_not_contact_times: client?.do_not_contact_times || '',
    status: client?.status || 'active',
    snooze_until: client?.snooze_until ? new Date(client.snooze_until) : null,
    notes: client?.notes || '', // Assuming notes might be a field
    email_notifications: client?.email_notifications || false,
    slack_notifications: client?.slack_notifications || false,
    slack_webhook_url: client?.slack_webhook_url || '',
    slack_team_id: client?.slack_team_id || '',
    slack_channels: client?.slack_channels || [],
    auto_assign_slack_tasks: client?.auto_assign_slack_tasks || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newSlackChannel, setNewSlackChannel] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersData = await UserEntity.list();
      setUsers(usersData);

      // Update settings with client data, ensuring new fields are present
      setSettings(prev => ({
        ...prev,
        default_assignee_email: client?.default_assignee_email || '',
        default_assignee_name: client?.default_assignee_name || '',
        default_work_category: client?.work_categories?.[0] || '',
        primary_contact: client?.contact_person || '',
        preferred_communication: client?.preferred_communication || 'email',
        secondary_contact: client?.secondary_contact || '',
        do_not_contact_times: client?.do_not_contact_times || '',
        status: client?.status || 'active',
        snooze_until: client?.snooze_until ? new Date(client.snooze_until) : null,
        notes: client?.notes || '',
        email_notifications: client?.email_notifications || false,
        slack_notifications: client?.slack_notifications || false,
        slack_webhook_url: client?.slack_webhook_url || '',
        slack_team_id: client?.slack_team_id || '',
        slack_channels: client?.slack_channels || [],
        auto_assign_slack_tasks: client?.auto_assign_slack_tasks || false,
      }));
    } catch (error) {
      console.error('Error loading settings data:', error);
    }
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));

    // Special handling for assignee selection
    if (field === 'default_assignee_email') {
      const user = users.find(u => u.email === value);
      if (user) {
        setSettings(prev => ({
          ...prev,
          default_assignee_email: user.email,
          default_assignee_name: user.full_name
        }));
      } else if (value === null || value === '') { // Allow clearing assignee
        setSettings(prev => ({
          ...prev,
          default_assignee_email: '',
          default_assignee_name: ''
        }));
      }
    }
  };

  const addSlackChannel = () => {
    if (newSlackChannel.trim() && !settings.slack_channels.includes(newSlackChannel.trim())) {
      setSettings(prev => ({
        ...prev,
        slack_channels: [...prev.slack_channels, newSlackChannel.trim()]
      }));
      setNewSlackChannel('');
    }
  };

  const removeSlackChannel = (channel) => {
    setSettings(prev => ({
      ...prev,
      slack_channels: prev.slack_channels.filter(c => c !== channel)
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        default_assignee_email: settings.default_assignee_email,
        default_assignee_name: settings.default_assignee_name,
        preferred_communication: settings.preferred_communication,
        contact_person: settings.primary_contact, // Ensure this maps to contact_person
        secondary_contact: settings.secondary_contact,
        do_not_contact_times: settings.do_not_contact_times,
        status: settings.status,
        email_notifications: settings.email_notifications,
        slack_notifications: settings.slack_notifications,
        slack_webhook_url: settings.slack_webhook_url,
        slack_team_id: settings.slack_team_id,
        slack_channels: settings.slack_channels,
        auto_assign_slack_tasks: settings.auto_assign_slack_tasks,
        notes: settings.notes, // Assuming notes should be saved
      };

      await Client.update(client.id, updateData);
      onClientUpdate(updateData);

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
    setIsSaving(false);
  };

  const handleArchiveClient = async () => {
    try {
      await Client.update(client.id, { status: 'archived' });
      onClientUpdate({ status: 'archived' });
      setShowArchiveDialog(false);
      alert('Client has been archived. You can find them in the archived clients view.');
    } catch (error) {
      console.error('Error archiving client:', error);
      alert('Failed to archive client. Please try again.');
    }
  };

  const handleDeleteClient = async () => {
    try {
      await Client.delete(client.id);
      setShowDeleteDialog(false);
      window.location.href = '/Clients';
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleSnoozeClient = async () => {
    try {
      const updateData = {
        status: 'snoozed',
        snooze_until: settings.snooze_until ? settings.snooze_until.toISOString() : null
      };
      await Client.update(client.id, updateData);
      onClientUpdate(updateData);
      alert('Client has been snoozed. Their tasks will be hidden from active views.');
    } catch (error) {
      console.error('Error snoozing client:', error);
      alert('Failed to snooze client. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Client Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Task Settings */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Default Task Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Assignee</Label>
              <Select
                value={settings.default_assignee_email}
                onValueChange={(value) => handleSettingChange('default_assignee_email', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No default assignee</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {user.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {user.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Work Category</Label>
              <Select
                value={settings.default_work_category}
                onValueChange={(value) => handleSettingChange('default_work_category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {client?.work_categories?.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Work Categories Management */}
        <WorkCategoriesManager client={client} onUpdate={onClientUpdate} />

        {/* Communication Preferences */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Communication Preferences
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Preferred Channel</Label>
              <Select
                value={settings.preferred_communication}
                onValueChange={(value) => handleSettingChange('preferred_communication', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primary Contact</Label>
              <Input
                value={settings.primary_contact}
                onChange={(e) => handleSettingChange('primary_contact', e.target.value)}
                placeholder="Primary contact person"
              />
            </div>

            <div className="space-y-2">
              <Label>Secondary Contact</Label>
              <Input
                value={settings.secondary_contact}
                onChange={(e) => handleSettingChange('secondary_contact', e.target.value)}
                placeholder="Secondary contact (optional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Do Not Contact Times</Label>
            <Textarea
              value={settings.do_not_contact_times}
              onChange={(e) => handleSettingChange('do_not_contact_times', e.target.value)}
              placeholder="e.g., Weekends, After 6 PM EST, Mondays before 10 AM..."
              className="h-20"
            />
          </div>
        </div>

        {/* Slack Integration */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Slack Integration
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable Slack Task Creation</Label>
                <p className="text-sm text-gray-600">Automatically create tasks from Slack messages</p>
              </div>
              <Switch
                checked={settings.slack_notifications}
                onCheckedChange={(checked) => handleSettingChange('slack_notifications', checked)}
              />
            </div>

            {settings.slack_notifications && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="slack_team_id">Slack Team ID</Label>
                  <Input
                    id="slack_team_id"
                    value={settings.slack_team_id}
                    onChange={(e) => handleSettingChange('slack_team_id', e.target.value)}
                    placeholder="T1234567890"
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-600">
                    Find this in your Slack app settings under "Basic Information"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Monitored Channels</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSlackChannel}
                      onChange={(e) => setNewSlackChannel(e.target.value)}
                      placeholder="Channel ID (e.g., C1234567890)"
                      className="bg-white"
                      onKeyPress={(e) => e.key === 'Enter' && addSlackChannel()}
                    />
                    <Button onClick={addSlackChannel} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settings.slack_channels.map(channel => (
                      <Badge key={channel} variant="secondary" className="flex items-center gap-1">
                        #{channel}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => removeSlackChannel(channel)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Right-click a channel → View channel details → Copy channel ID
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto-assign to Default User</Label>
                    <p className="text-sm text-gray-600">Assign Slack-created tasks to default assignee</p>
                  </div>
                  <Switch
                    checked={settings.auto_assign_slack_tasks}
                    onCheckedChange={(checked) => handleSettingChange('auto_assign_slack_tasks', checked)}
                  />
                </div>
                {/*
                <div className="space-y-2">
                  <Label htmlFor="slack_webhook_url">Slack Webhook URL (Legacy)</Label>
                  <Input
                    id="slack_webhook_url"
                    value={settings.slack_webhook_url}
                    onChange={(e) => handleSettingChange('slack_webhook_url', e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX"
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-600">
                    (Optional) If you prefer to use an old-style incoming webhook.
                  </p>
                </div>
                */}
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <h5 className="font-medium text-yellow-800 mb-2">Setup Instructions:</h5>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Create a Slack app at <a href="https://api.slack.com/" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com</a></li>
                    <li>Enable Events API and add this Request URL:</li>
                    <li className="font-mono text-xs bg-yellow-200 p-1 rounded ml-4">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/slackWebhook` : 'YOUR_APP_URL/api/slackWebhook'}
                    </li>
                    <li>Subscribe to "message.channels", "message.groups", "message.im" events.</li>
                    <li>Go to "OAuth & Permissions" and add "channels:read", "groups:read", "im:read" scopes.</li>
                    <li>Install the app to your workspace.</li>
                    <li>Add the bot to the channels you want to monitor.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Client Status Management */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Client Status Management
          </h4>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select
                value={settings.status}
                onValueChange={(value) => handleSettingChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </SelectItem>
                  <SelectItem value="snoozed">
                    <Badge className="bg-yellow-100 text-yellow-800">Snoozed</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.status === 'snoozed' && (
              <div className="space-y-2">
                <Label>Snooze Until (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {settings.snooze_until ? format(settings.snooze_until, 'PPP') : 'Set date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={settings.snooze_until}
                      onSelect={(date) => handleSettingChange('snooze_until', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {settings.status === 'active' && (
              <Button
                variant="outline"
                onClick={handleSnoozeClient}
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Snooze Client
              </Button>
            )}
          </div>
        </div>

        {/* Save Settings */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4 p-4 rounded-lg border-red-200 bg-red-50 border">
          <h4 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h4>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(true)}
              className="border-orange-300 text-orange-800 hover:bg-orange-100"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive Client
            </Button>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Client
            </Button>
          </div>
          <p className="text-sm text-red-600">
            <strong>Archive:</strong> Hides the client from active views but preserves all data.
            <br />
            <strong>Delete:</strong> Permanently removes the client and all associated tasks, documents, and time entries.
          </p>
        </div>
      </CardContent>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{client?.name}"? This will hide the client and their tasks from active views, but all data will be preserved. You can restore them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveClient} className="bg-orange-600 hover:bg-orange-700">
              Archive Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{client?.name}"? This action cannot be undone and will remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The client record</li>
                <li>All associated tasks and boards</li>
                <li>All documents and files</li>
                <li>All time entries and reports</li>
                <li>All chat conversations</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
