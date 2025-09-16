import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User, Mail, Phone, Calendar, DollarSign, Globe, BrainCircuit, Upload, Trash2, Lock, Clock, Camera } from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { ClientDocument } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";

const colorOptions = [
  { name: 'Ocean Blue', value: '#0073EA' },
  { name: 'Success Green', value: '#00C875' },
  { name: 'Warning Orange', value: '#FFCB00' },
  { name: 'Danger Red', value: '#E2445C' },
  { name: 'Purple', value: '#A25DDC' },
  { name: 'Teal', value: '#00D9FF' },
  { name: 'Gray', value: '#676879' },
  { name: 'Pink', value: '#FF6B9D' }
];

export default function CreateClientModal({ isOpen, onClose, onSubmit }) {
  const initialClientData = {
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    color: '#0073EA',
    avatar_url: '',
    description: '',
    retainer_hours: '',
    hourly_rate: '',
    default_assignee_email: '',
    default_assignee_name: ''
  };

  const [clientData, setClientData] = useState(initialClientData);
  const [files, setFiles] = useState([]);
  const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
  const [keyInformationText, setKeyInformationText] = useState('');
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const usersData = await UserEntity.list();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setClientData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    }
    setUploadingLogo(false);
    e.target.value = ''; // Reset input
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const removeLogo = () => {
    setClientData(prev => ({ ...prev, avatar_url: '' }));
  };

  const resetForm = () => {
    setClientData(initialClientData);
    setFiles([]);
    setKnowledgeBaseText('');
    setKeyInformationText('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...clientData,
        contact_person: clientData.name, // Use company name as contact person to avoid confusion
        retainer_hours: clientData.retainer_hours ? parseFloat(clientData.retainer_hours) : null,
        hourly_rate: clientData.hourly_rate ? parseFloat(clientData.hourly_rate) : null
      };
      
      const newClient = await onSubmit(submitData);

      // Handle file uploads and documents
      if (files.length > 0) {
        for (const file of files) {
          try {
            if (!newClient || !newClient.id || !newClient.board_id) {
                console.error('New client data is missing ID or Board ID. Cannot upload document.');
                continue;
            }
            const { file_url } = await UploadFile({ file });
            await ClientDocument.create({
              client_id: newClient.id,
              board_id: newClient.board_id,
              title: file.name,
              category: 'onboarding',
              file_url: file_url,
              file_type: file.type,
              file_size: file.size
            });
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
          }
        }
      }

      // Handle knowledge base and key info documents
      if (knowledgeBaseText.trim()) {
        if (!newClient || !newClient.id || !newClient.board_id) {
            console.error('New client data is missing ID or Board ID. Cannot create knowledge base document.');
        } else {
            await ClientDocument.create({
              client_id: newClient.id,
              board_id: newClient.board_id,
              title: 'Initial Knowledge Base Document',
              category: 'sop',
              content: knowledgeBaseText,
            });
        }
      }

      if (keyInformationText.trim()) {
        if (!newClient || !newClient.id || !newClient.board_id) {
            console.error('New client data is missing ID or Board ID. Cannot create key info document.');
        } else {
            await ClientDocument.create({
              client_id: newClient.id,
              board_id: newClient.board_id,
              title: 'Key Information & Credentials',
              category: 'key_info',
              content: keyInformationText,
            });
        }
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
    }
    setIsSubmitting(false);
  };

  const handleChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAssigneeChange = (email) => {
      const user = users.find(u => u.email === email);
      if (user) {
          setClientData(prev => ({
              ...prev,
              default_assignee_email: user.email,
              default_assignee_name: user.full_name
          }));
      } else {
          setClientData(prev => ({
              ...prev,
              default_assignee_email: '',
              default_assignee_name: ''
          }));
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#323338] flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Create New Client
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#323338] font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Name *
              </Label>
              <Input
                id="name"
                value={clientData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Acme Corporation"
                className="rounded-xl border-[#E1E5F3] h-12"
                required
              />
            </div>

            {/* Logo Upload Section */}
            <div className="space-y-2">
              <Label className="text-[#323338] font-medium flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Company Logo
              </Label>
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="relative">
                  {clientData.avatar_url ? (
                    <div className="relative">
                      <img
                        src={clientData.avatar_url}
                        alt="Client logo"
                        className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeLogo}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: clientData.color || '#0073EA' }}
                    >
                      {clientData.name ? clientData.name.charAt(0) : '?'}
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, or GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information - Simplified */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#323338] font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={clientData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@acme.com"
                  className="rounded-xl border-[#E1E5F3] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#323338] font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={clientData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="rounded-xl border-[#E1E5F3] h-12"
                />
              </div>
            </div>

            {/* Additional Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="text-[#323338] font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  value={clientData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://acme.com"
                  className="rounded-xl border-[#E1E5F3] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-[#323338] font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  value={clientData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="rounded-xl border-[#E1E5F3] h-12"
                />
              </div>
            </div>
          </div>

          {/* Default Assignee */}
          <div className="space-y-2">
              <Label htmlFor="default_assignee" className="text-[#323338] font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Default Assignee
              </Label>
              <Select onValueChange={handleAssigneeChange} value={clientData.default_assignee_email || ''}>
                <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                    <SelectValue placeholder="Select a default user for tasks..." />
                </SelectTrigger>
                <SelectContent>
                    {users.map(user => (
                        <SelectItem key={user.email} value={user.email}>{user.full_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
          </div>

          {/* Retainer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="retainer_hours" className="text-[#323338] font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Retainer Hours
              </Label>
              <Input
                id="retainer_hours"
                type="number"
                value={clientData.retainer_hours}
                onChange={(e) => handleChange('retainer_hours', e.target.value)}
                placeholder="e.g., 20"
                className="rounded-xl border-[#E1E5F3] h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourly_rate" className="text-[#323338] font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Hourly Rate
              </Label>
              <Input
                id="hourly_rate"
                type="number"
                value={clientData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="e.g., 75"
                className="rounded-xl border-[#E1E5F3] h-12"
              />
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="text-[#323338] font-medium">Fallback Color (when no logo is set)</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleChange('color', color.value)}
                  className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                    clientData.color === color.value 
                      ? 'border-[#323338] scale-110 shadow-lg' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#323338] font-medium">
              Project Description
            </Label>
            <Textarea
              id="description"
              value={clientData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the project and client requirements..."
              className="rounded-xl border-[#E1E5F3] min-h-[100px]"
            />
          </div>

          {/* Onboarding Assets */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-[#323338]">Onboarding Assets</h3>
            <div className="space-y-2">
              <Label htmlFor="files" className="text-[#323338] font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Files
              </Label>
              <Input
                id="files"
                type="file"
                multiple
                onChange={handleFileChange}
                className="rounded-xl border-[#E1E5F3] h-12 file:mr-4 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:bg-[#0073EA]/10 file:text-[#0073EA] hover:file:bg-[#0073EA]/20"
              />
               {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="truncate">{file.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-info" className="text-[#323338] font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Key Information (Logins, Links, etc.)
              </Label>
              <Textarea
                id="key-info"
                value={keyInformationText}
                onChange={(e) => setKeyInformationText(e.target.value)}
                placeholder="e.g., Website Admin: user/pass, Google Drive: link..."
                className="rounded-xl border-[#E1E5F3] min-h-[120px] font-mono text-sm"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge" className="text-[#323338] font-medium flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                AI Knowledge Base
              </Label>
              <Textarea
                id="knowledge"
                value={knowledgeBaseText}
                onChange={(e) => setKnowledgeBaseText(e.target.value)}
                placeholder="Paste any relevant info for the AI, e.g., company tone of voice, returns policy, key contacts..."
                className="rounded-xl border-[#E1E5F3] min-h-[120px]"
                rows={5}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onClose(); }}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!clientData.name.trim() || isSubmitting}
              className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-xl h-12 px-6 font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}