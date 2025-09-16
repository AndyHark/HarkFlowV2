import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Building2, Mail, Phone, Globe, Palette, Camera, Upload, Trash2 } from "lucide-react";
import { User as UserEntity } from "@/api/entities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";

const colorOptions = [
  '#0073EA', '#00C875', '#A25DDC', '#FFCB00', '#E2445C',
  '#FDAB3D', '#787D80', '#FB275D', '#00D2D2', '#9CD326'
];

export default function EditClientModal({ isOpen, onClose, client, onUpdate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    color: '#0073EA',
    avatar_url: '',
    default_assignee_email: null,
  });
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
      if (client) {
          setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            website: client.website || '',
            description: client.description || '',
            color: client.color || '#0073EA',
            avatar_url: client.avatar_url || '',
            default_assignee_email: client.default_assignee_email || null,
          });
      }
      if (isOpen) {
        loadUsers();
      }
  }, [client, isOpen]);

  const loadUsers = async () => {
    try {
        const usersData = await UserEntity.list();
        setUsers(usersData);
    } catch(e) {
        console.error("Failed to load users", e);
    }
  }

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
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    }
    setUploadingLogo(false);
    e.target.value = ''; // Reset input
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, avatar_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    setIsSubmitting(true);
    try {
      // Update contact_person to match name to avoid confusion
      const submitData = {
        ...formData,
        contact_person: formData.name
      };
      await onUpdate(submitData);
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
    }
    setIsSubmitting(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAssigneeChange = (email) => {
      const user = users.find(u => u.email === email);
      setFormData(prev => ({
          ...prev,
          default_assignee_email: user?.email || null,
          default_assignee_name: user?.full_name || null
      }));
  }

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Edit Client Details
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#323338] font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Company Name *
            </Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter company name..."
              className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2 focus:ring-[#0073EA]/20"
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
                {formData.avatar_url ? (
                  <div className="relative">
                    <img
                      src={formData.avatar_url}
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
                    style={{ backgroundColor: formData.color || '#0073EA' }}
                  >
                    {formData.name ? formData.name.charAt(0) : '?'}
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
                  id="logo-upload-edit"
                />
                <Label
                  htmlFor="logo-upload-edit"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, or GIF up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Simplified Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#323338] font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@company.com"
                className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2 focus:ring-[#0073EA]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#323338] font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2 focus:ring-[#0073EA]/20"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-[#323338] font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://company.com"
              className="rounded-xl border-[#E1E5F3] h-12 focus:ring-2 focus:ring-[#0073EA]/20"
            />
          </div>

          {/* Default Assignee */}
          <div className="space-y-2">
            <Label htmlFor="default_assignee" className="text-[#323338] font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Default Assignee
            </Label>
            <Select value={formData.default_assignee_email || ""} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                    <SelectValue placeholder="Select a default user..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {users.map(user => (
                        <SelectItem key={user.email} value={user.email}>{user.full_name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#323338] font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the client or project..."
              className="rounded-xl border-[#E1E5F3] focus:ring-2 focus:ring-[#0073EA]/20"
              rows={3}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-[#323338] font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Fallback Color (when no logo is set)
            </Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleInputChange('color', color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name?.trim() || isSubmitting}
              className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-xl h-12 px-6 font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}