import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Edit3, Trash2, Tag } from "lucide-react";
import { Client } from "@/api/entities";

export default function WorkCategoriesManager({ client, onUpdate }) {
  const [categories, setCategories] = useState(client?.work_categories || []);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCategories(client?.work_categories || []);
  }, [client]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      saveChanges(updatedCategories);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);
    saveChanges(updatedCategories);
  };

  const startEditing = (index, text) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const handleUpdateCategory = () => {
    if (editingText.trim()) {
      const updatedCategories = [...categories];
      updatedCategories[editingIndex] = editingText.trim();
      setCategories(updatedCategories);
      saveChanges(updatedCategories);
      setEditingIndex(-1);
      setEditingText('');
    }
  };

  const saveChanges = async (updatedCategories) => {
    setIsSaving(true);
    try {
      await Client.update(client.id, { work_categories: updatedCategories });
      if (onUpdate) {
        onUpdate({ ...client, work_categories: updatedCategories });
      }
    } catch (error) {
      console.error("Failed to save categories:", error);
      alert("Could not save categories. Please try again.");
      setCategories(client?.work_categories || []); // Revert on error
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Work Categories
        </CardTitle>
        <CardDescription>Manage the available work categories for this client's tasks and time entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              editingIndex === index ? (
                <div key={index} className="flex gap-1">
                  <Input 
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                    autoFocus
                    className="h-8"
                  />
                  <Button size="icon" className="h-8 w-8" onClick={handleUpdateCategory}><Save className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingIndex(-1)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Badge key={index} variant="secondary" className="text-sm px-3 py-1 flex items-center gap-2 bg-gray-200 text-gray-800">
                  {category}
                  <button onClick={() => startEditing(index, category)} className="ml-1 text-gray-500 hover:text-gray-900">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleRemoveCategory(index)} className="ml-1 text-gray-500 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              )
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add new category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}