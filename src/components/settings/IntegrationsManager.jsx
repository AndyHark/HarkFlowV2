import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Settings,
  CheckCircle2,
  Clock,
  Webhook,
  MessageSquare,
  Calendar,
  Zap,
  FileText,
  Cloud,
  Link2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export default function IntegrationsManager() {
  const [integrations, setIntegrations] = useState({
    email: { connected: false, settings: {} },
    webhooks: { connected: false, settings: {} },
    slack: { connected: false, settings: {} },
    calendar: { connected: false, settings: {} },
    zapier: { connected: false, settings: {} },
    googledrive: { connected: false, settings: {} }
  });
  
  const [activeIntegration, setActiveIntegration] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const integrationConfigs = {
    email: {
      title: "Email Integration",
      description: "Send automated emails for task updates and notifications",
      icon: Mail,
      color: "blue",
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'number', placeholder: '587' },
        { key: 'username', label: 'Username', type: 'email', placeholder: 'your@email.com' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'App Password' },
        { key: 'from_name', label: 'From Name', type: 'text', placeholder: 'ClientFlow' }
      ]
    },
    webhooks: {
      title: "Webhooks",
      description: "Send real-time data to external services when tasks change",
      icon: Webhook,
      color: "purple",
      fields: [
        { key: 'endpoint_url', label: 'Webhook URL', type: 'url', placeholder: 'https://your-service.com/webhook' },
        { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'Optional signing secret' },
        { key: 'events', label: 'Trigger Events', type: 'multiselect', options: [
          'task.created', 'task.updated', 'task.completed', 'task.deleted',
          'client.created', 'client.updated', 'board.created'
        ]}
      ]
    },
    slack: {
      title: "Slack",
      description: "Get task updates and notifications in Slack channels",
      icon: MessageSquare,
      color: "green",
      fields: [
        { key: 'webhook_url', label: 'Slack Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...' },
        { key: 'default_channel', label: 'Default Channel', type: 'text', placeholder: '#general' },
        { key: 'notify_on_overdue', label: 'Notify on Overdue Tasks', type: 'boolean' },
        { key: 'daily_summary', label: 'Daily Summary Report', type: 'boolean' }
      ]
    },
    calendar: {
      title: "Calendar Sync",
      description: "Sync task deadlines with Google Calendar or Outlook",
      icon: Calendar,
      color: "orange",
      fields: [
        { key: 'provider', label: 'Calendar Provider', type: 'select', options: ['google', 'outlook'] },
        { key: 'calendar_id', label: 'Calendar ID', type: 'text', placeholder: 'primary' },
        { key: 'sync_deadlines', label: 'Sync Task Deadlines', type: 'boolean' },
        { key: 'reminder_minutes', label: 'Default Reminder (minutes)', type: 'number', placeholder: '30' }
      ]
    },
    zapier: {
      title: "Zapier",
      description: "Connect with 5000+ apps through Zapier automation",
      icon: Zap,
      color: "yellow",
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Zapier webhook key' },
        { key: 'trigger_url', label: 'Zapier Webhook URL', type: 'url', placeholder: 'https://zapier.com/hooks/catch/...' }
      ]
    },
    googledrive: {
      title: "Google Drive",
      description: "Save task attachments and documents to Google Drive",
      icon: Cloud,
      color: "blue",
      fields: [
        { key: 'folder_id', label: 'Drive Folder ID', type: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
        { key: 'auto_backup', label: 'Auto Backup Documents', type: 'boolean' },
        { key: 'sync_frequency', label: 'Sync Frequency', type: 'select', options: ['realtime', 'hourly', 'daily'] }
      ]
    }
  };

  const handleConfigureIntegration = (integrationKey) => {
    setActiveIntegration(integrationKey);
    setShowConfigModal(true);
  };

  const handleSaveIntegration = (formData) => {
    setIntegrations(prev => ({
      ...prev,
      [activeIntegration]: {
        connected: true,
        settings: formData
      }
    }));
    setShowConfigModal(false);
    setActiveIntegration(null);
  };

  const handleDisconnectIntegration = (integrationKey) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationKey]: {
        connected: false,
        settings: {}
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(integrationConfigs).map(([key, config]) => {
          const integration = integrations[key];
          const IconComponent = config.icon;
          const isConnected = integration.connected;
          
          return (
            <Card key={key} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 bg-${config.color}-100 rounded-lg flex items-center justify-center`}
                  >
                    <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {config.title}
                      {isConnected && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </CardTitle>
                    {isConnected && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{config.description}</p>
                
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleConfigureIntegration(key)}
                        className="flex-1"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDisconnectIntegration(key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => handleConfigureIntegration(key)}
                      className="w-full bg-[#0073EA] hover:bg-[#0056B3]"
                      size="sm"
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
                
                {key === 'slack' && !isConnected && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <AlertCircle className="w-3 h-3" />
                    <span>Need Slack webhook URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {activeIntegration && (
        <IntegrationConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          integration={integrationConfigs[activeIntegration]}
          currentSettings={integrations[activeIntegration].settings}
          onSave={handleSaveIntegration}
        />
      )}
    </div>
  );
}

// Configuration Modal Component
function IntegrationConfigModal({ isOpen, onClose, integration, currentSettings, onSave }) {
  const [formData, setFormData] = useState(currentSettings || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSave(formData);
    setIsSaving(false);
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';
    
    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Switch
              id={field.key}
              checked={value}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, [field.key]: checked }))
              }
            />
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <select
              id={field.key}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select {field.label}</option>
              {field.options.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            <Label>{field.label}</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {field.options.map(option => (
                <div key={option} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`${field.key}-${option}`}
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentArray = value || [];
                      const newArray = e.target.checked
                        ? [...currentArray, option]
                        : currentArray.filter(item => item !== option);
                      setFormData(prev => ({ ...prev, [field.key]: newArray }));
                    }}
                    className="rounded"
                  />
                  <Label htmlFor={`${field.key}-${option}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Textarea
              id={field.key}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              rows={3}
            />
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type={field.type}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <integration.icon className={`w-5 h-5 text-${integration.color}-600`} />
            Configure {integration.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">{integration.description}</p>
          
          {integration.fields.map(field => (
            <div key={field.key}>
              {renderField(field)}
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[#0073EA] hover:bg-[#0056B3]"
          >
            {isSaving ? 'Saving...' : 'Save Integration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}