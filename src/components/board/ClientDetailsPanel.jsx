
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Upload,
  FileText,
  Download,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Edit3,
  Save
} from "lucide-react";
import { motion } from "framer-motion";
import { Client } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { UploadFile } from "@/api/integrations";

const categoryColors = {
  sop: { bg: '#E0E7FF', text: '#4338CA', label: 'SOP' },
  onboarding: { bg: '#D1FAE5', text: '#059669', label: 'Onboarding' },
  contract: { bg: '#FEE2E2', text: '#DC2626', label: 'Contract' },
  brief: { bg: '#FEF3C7', text: '#D97706', label: 'Brief' },
  notes: { bg: '#F3F4F6', text: '#6B7280', label: 'Notes' },
  training: { bg: '#FECACA', text: '#EF4444', label: 'Training' },
  compliance: { bg: '#DDD6FE', text: '#7C3AED', label: 'Compliance' },
  other: { bg: '#E5E7EB', text: '#4B5563', label: 'Other' }
};

export default function ClientDetailsPanel({ board, onClose }) {
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [clientData, setClientData] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadClientDetails = async () => {
      if (!board?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Correctly find the client using the board's ID
        const clientDataFetched = await Client.filter({ board_id: board.id });
        if (clientDataFetched.length > 0) {
          setClient(clientDataFetched[0]);
        } else {
          // A board without a client is not an error
          console.log("No client is associated with this board.");
          setClient(null);
        }
      } catch (err) {
        console.error("Error loading client details:", err);
        setError("Failed to load client information.");
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadClientDetails();
  }, [board?.id]);

  useEffect(() => {
    if (client) { // `client` here is the stateful client
      loadDocuments();
      setClientData(client);
    } else {
      // If client becomes null, clear clientData to reflect no client being edited
      setClientData({});
    }
  }, [client]); // Depend on the stateful client

  const loadDocuments = async () => {
    try {
      const docs = await ClientDocument.filter({ client_id: client?.id }, '-created_date');
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });

      // Try to extract content for AI processing
      let content = '';
      try {
        if (file.type === 'text/plain' || file.name.endsWith('.md')) {
          // For local files, you'd use FileReader. For an already uploaded URL, you'd fetch it.
          // Since the file_url is from a fresh upload, we assume we might still have the File object.
          // For simplicity, we'll assume `file` is the original File object if accessible.
          // If content extraction needs to happen after upload (e.g., from `file_url`),
          // a separate fetch/processing step would be needed.
          // For now, let's keep the existing logic, which implies file content is available locally before upload.
          // Or, if `UploadFile` returns file_url immediately, it implies content needs to be fetched from it.
          // For robustness, if `file` content is needed for `content` field *before* upload, it should be read with FileReader.
          // If `content` means AI processing *after* upload from `file_url`, the `fetch` from `file_url` is correct.
          const response = await fetch(file_url);
          content = await response.text();
        }
      } catch (extractError) {
        console.log('Could not extract text content from uploaded file URL:', extractError);
        content = ''; // Ensure content is reset on error
      }

      const documentData = {
        client_id: client.id,
        board_id: board?.id,
        title: file.name,
        category: 'other',
        file_url,
        content,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        tags: []
      };

      const newDoc = await ClientDocument.create(documentData);
      setDocuments(prev => [newDoc, ...prev]);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setIsUploading(false);
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await ClientDocument.delete(docId);
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleUpdateDocumentCategory = async (docId, category) => {
    try {
      await ClientDocument.update(docId, { category });
      setDocuments(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, category } : doc
      ));
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleSaveClient = async () => {
    try {
      await Client.update(client.id, clientData);
      setClient(prev => ({ ...prev, ...clientData })); // Update the main client state as well
      setEditingClient(false);
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0073EA] mx-auto mb-4"></div>
            <p>Loading client details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">No Client Information</h3>
            <p className="text-gray-600 mb-4">This board is not associated with a specific client.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-[#E1E5F3] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#E1E5F3]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{ backgroundColor: client.color || '#0073EA' }}
          >
            {client.avatar_url ? (
              <img src={client.avatar_url} alt={client.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              client.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[#323338]">{client.name}</h3>
            <p className="text-xs text-[#676879]">Client Details</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            Documents
            {documents.length > 0 && (
              <Badge className="ml-1 bg-[#0073EA] text-white text-xs">
                {documents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-[#323338]">Client Information</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editingClient ? handleSaveClient() : setEditingClient(true)}
              >
                {editingClient ? (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            {/* Client Details */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Company
                </Label>
                {editingClient ? (
                  <Input
                    value={clientData.name || ''}
                    onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="text-sm font-medium text-[#323338]">{client.name}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Contact Person
                </Label>
                {editingClient ? (
                  <Input
                    value={clientData.contact_person || ''}
                    onChange={(e) => setClientData(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="text-sm text-[#323338]">{client.contact_person}</p>
                )}
              </div>

              {client.email && (
                <div>
                  <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </Label>
                  {editingClient ? (
                    <Input
                      value={clientData.email || ''}
                      onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <a href={`mailto:${client.email}`} className="text-sm text-[#0073EA] hover:underline">
                      {client.email}
                    </a>
                  )}
                </div>
              )}

              {client.phone && (
                <div>
                  <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </Label>
                  {editingClient ? (
                    <Input
                      value={clientData.phone || ''}
                      onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <a href={`tel:${client.phone}`} className="text-sm text-[#0073EA] hover:underline">
                      {client.phone}
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#676879] mb-1">Status</Label>
                  <Badge className="text-xs">
                    {client.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-[#676879] mb-1">Priority</Label>
                  <Badge variant="outline" className="text-xs">
                    {client.priority}
                  </Badge>
                </div>
              </div>

              {(client.start_date || client.end_date) && (
                <div className="grid grid-cols-2 gap-4">
                  {client.start_date && (
                    <div>
                      <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Date
                      </Label>
                      <p className="text-sm text-[#323338]">
                        {client.start_date ? new Date(client.start_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                  {client.end_date && (
                    <div>
                      <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        End Date
                      </Label>
                      <p className="text-sm text-[#323338]">
                        {client.end_date ? new Date(client.end_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {client.budget && (
                <div>
                  <Label className="text-xs text-[#676879] mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Budget
                  </Label>
                  <p className="text-sm font-medium text-[#323338]">
                    ${client.budget.toLocaleString()}
                  </p>
                </div>
              )}

              {client.industry && (
                <div>
                  <Label className="text-xs text-[#676879] mb-1">Industry</Label>
                  <Badge variant="outline" className="text-xs">
                    {client.industry}
                  </Badge>
                </div>
              )}

              {client.description && (
                <div>
                  <Label className="text-xs text-[#676879] mb-1">Description</Label>
                  <p className="text-sm text-[#323338] bg-[#F5F6F8] p-3 rounded-lg">
                    {client.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-[#323338]">Documents & SOPs</h4>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" className="cursor-pointer" disabled={isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
              />
            </label>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {documents.map((doc) => {
              const category = categoryColors[doc.category] || categoryColors.other;
              return (
                <Card key={doc.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <h5 className="text-sm font-medium text-[#323338] truncate">
                          {doc.title}
                        </h5>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <select
                          value={doc.category}
                          onChange={(e) => handleUpdateDocumentCategory(doc.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border"
                          style={{
                            backgroundColor: category.bg,
                            color: category.text,
                            borderColor: category.text + '40'
                          }}
                        >
                          {Object.entries(categoryColors).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <p className="text-xs text-[#676879]">
                        {formatFileSize(doc.file_size)} • {new Date(doc.created_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {documents.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#676879] text-sm">No documents uploaded yet</p>
                <p className="text-xs text-[#676879] mt-1">
                  Upload SOPs, contracts, and other client documents
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
