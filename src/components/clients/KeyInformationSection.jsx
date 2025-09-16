
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Edit3, 
  Save, 
  X, 
  Copy, 
  Check,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientDocument } from "@/api/entities";

export default function KeyInformationSection({ documents, client, onClientUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showContent, setShowContent] = useState(false); // Kept as per "keep existing code" in outline
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const keyInfoDoc = documents.find(doc => doc.category === 'key_info');

  useEffect(() => {
    if (keyInfoDoc) {
      setOriginalContent(keyInfoDoc.content || '');
      setEditContent(keyInfoDoc.content || '');
    }
  }, [keyInfoDoc]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setShowContent(true); // Kept as per "keep existing code" in outline
  };

  const handleCancelEdit = () => {
    setEditContent(originalContent);
    setIsEditing(false);
  };

  const extractContactInfo = (content) => {
    if (!content) return {};

    const lines = content.split('\n');
    const contactInfo = {};

    lines.forEach(line => {
      const [label, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (!label || !value) return;

      const normalizedLabel = label.trim().toLowerCase();
      
      // Extract contact details
      if (normalizedLabel.includes('name') && !normalizedLabel.includes('company')) {
        contactInfo.contact_person = value;
      } else if (normalizedLabel.includes('email') && !normalizedLabel.includes('password')) {
        contactInfo.email = value;
      } else if (normalizedLabel.includes('phone')) {
        contactInfo.phone = value;
      } else if (normalizedLabel.includes('website') || normalizedLabel.includes('site')) {
        contactInfo.website = value.startsWith('http') ? value : `https://${value}`;
      }
    });

    return contactInfo;
  };

  const handleSyncToClient = async () => {
    if (!editContent || !onClientUpdate) return;

    setIsSyncing(true);
    try {
      const contactInfo = extractContactInfo(editContent);
      
      if (Object.keys(contactInfo).length > 0) {
        await onClientUpdate(contactInfo);
      }
    } catch (error) {
      console.error('Error syncing contact info:', error);
    }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!client) return;

    setIsSaving(true);
    try {
      if (keyInfoDoc) {
        // Update existing document
        await ClientDocument.update(keyInfoDoc.id, {
          content: editContent
        });
      } else {
        // Create new document
        await ClientDocument.create({
          client_id: client.id,
          board_id: client.board_id,
          title: 'Key Information & Credentials',
          category: 'key_info',
          content: editContent
        });
      }
      
      setOriginalContent(editContent);
      setIsEditing(false);
      
      // Auto-sync contact details to client
      await handleSyncToClient();
      
      // Refresh the page to show updated documents
      window.location.reload();
    } catch (error) {
      console.error('Error saving key information:', error);
    }
    setIsSaving(false);
  };

  const handleCopy = async () => {
    if (keyInfoDoc?.content) {
      await navigator.clipboard.writeText(keyInfoDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Removed maskedContent definition as it's no longer used
  const displayContent = keyInfoDoc?.content || ''; // Updated as per outline

  if (!keyInfoDoc && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Key Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">No key information stored</p>
            <Button 
              onClick={handleStartEdit}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Add Key Information
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Key Information
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                {/* Eye/EyeOff button kept as per "keep existing code" in outline, though its functionality is inert */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowContent(!showContent)}
                  className="h-8 w-8"
                >
                  {showContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSyncToClient}
                  disabled={isSyncing}
                  className="h-8 w-8"
                  title="Sync contact details to client info"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Key Information & Credentials
                </label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter key information, contact details, passwords, etc.&#10;&#10;Format:&#10;Name: John Doe&#10;Email: john@example.com&#10;Phone: +1234567890&#10;Password: SecurePass123&#10;Website: https://example.com"
                  className="min-h-[200px] font-mono text-sm bg-gray-50 border-gray-300"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Contact details (name, email, phone, website) will automatically sync to the client's main contact information when saved.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save & Sync
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-gray-50 rounded-lg p-4 border overflow-hidden"> {/* Added overflow-hidden */}
                <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed"> {/* Added break-words */}
                  {displayContent || 'No information stored.'}
                </pre>
              </div>
              {/* Removed sensitive content badge as per outline */}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
