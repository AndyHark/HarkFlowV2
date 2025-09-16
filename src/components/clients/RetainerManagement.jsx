import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Clock, Edit, Save, PlusCircle } from "lucide-react";
import { ClientRetainer } from "@/api/entities";
import { Switch } from "@/components/ui/switch";

export default function RetainerManagement({ client, onRetainerUpdate }) {
  const [retainer, setRetainer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    monthly_hours: '',
    hourly_rate: '',
    overage_rate: '',
    is_active: true
  });

  useEffect(() => {
    fetchRetainer();
  }, [client.id]);

  const fetchRetainer = async () => {
    setIsLoading(true);
    try {
      const existingRetainers = await ClientRetainer.filter({ client_id: client.id });
      if (existingRetainers.length > 0) {
        const activeRetainer = existingRetainers.find(r => r.is_active) || existingRetainers[0];
        setRetainer(activeRetainer);
        setFormData({
          monthly_hours: activeRetainer.monthly_hours || '',
          hourly_rate: activeRetainer.hourly_rate || '',
          overage_rate: activeRetainer.overage_rate || '',
          is_active: activeRetainer.is_active,
        });
      } else {
        setRetainer(null);
        setIsEditing(true); // Default to editing if no retainer exists
      }
    } catch (error) {
      console.error("Error fetching retainer:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const dataToSave = {
        client_id: client.id,
        monthly_hours: parseFloat(formData.monthly_hours) || 0,
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        overage_rate: parseFloat(formData.overage_rate) || parseFloat(formData.hourly_rate) || 0,
        is_active: formData.is_active,
        start_date: new Date().toISOString().split('T')[0],
      };

      let updatedRetainer;
      if (retainer) {
        updatedRetainer = await ClientRetainer.update(retainer.id, dataToSave);
      } else {
        updatedRetainer = await ClientRetainer.create(dataToSave);
      }
      
      setRetainer(updatedRetainer);
      onRetainerUpdate(updatedRetainer); // Notify parent component
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving retainer:", error);
      alert('Failed to save retainer details.');
    }
    setIsLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const monthlyCost = (formData.monthly_hours || 0) * (formData.hourly_rate || 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retainer & Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isEditing && retainer) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Retainer & Billing</CardTitle>
            <CardDescription>Current monthly agreement.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{retainer.monthly_hours || 0} hrs</p>
              <p className="text-sm text-gray-500">Monthly Retainer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${retainer.hourly_rate || 0}/hr</p>
              <p className="text-sm text-gray-500">Hourly Rate</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${((retainer.monthly_hours || 0) * (retainer.hourly_rate || 0)).toFixed(2)}</p>
              <p className="text-sm text-gray-500">Monthly Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{retainer ? 'Edit Retainer' : 'Set Up Retainer'}</CardTitle>
        <CardDescription>Define the monthly billing agreement for this client.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly_hours">Monthly Hours</Label>
            <Input 
              id="monthly_hours" 
              type="number" 
              placeholder="e.g., 20"
              value={formData.monthly_hours}
              onChange={(e) => handleInputChange('monthly_hours', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
            <Input 
              id="hourly_rate" 
              type="number" 
              placeholder="e.g., 75"
              value={formData.hourly_rate}
              onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overage_rate">Overage Rate ($)</Label>
            <Input 
              id="overage_rate" 
              type="number" 
              placeholder="Defaults to hourly rate"
              value={formData.overage_rate}
              onChange={(e) => handleInputChange('overage_rate', e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="is_active" 
            checked={formData.is_active}
            onCheckedChange={(checked) => handleInputChange('is_active', checked)}
          />
          <Label htmlFor="is_active">Retainer is active</Label>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500">Calculated Monthly Cost</p>
            <p className="text-2xl font-bold text-gray-800">${monthlyCost.toFixed(2)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {retainer && (
           <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
        )}
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Retainer
        </Button>
      </CardFooter>
    </Card>
  );
}