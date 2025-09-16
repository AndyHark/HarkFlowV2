
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, File, X, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM } from '@/api/integrations';
import { Client } from "@/api/entities";
import { Board } from "@/api/entities";
import { ClientDocument } from "@/api/entities";

export default function AsanaImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Awaiting file...');
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please drop a valid CSV file.');
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setIsLoading(false);
    setStatusMessage('Awaiting file...');
    onClose();
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please provide a CSV file.");
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // Step 1: Upload the file
      setStatusMessage('Uploading file...');
      const { file_url: fileUrl } = await UploadFile({ file });
      if (!fileUrl) throw new Error("File upload failed.");

      // Step 2: Extract data from CSV
      setStatusMessage('Extracting relevant data...');
      const extractionSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            col_e: { type: "string", description: "Information type/name" },
            col_f: { type: "string", description: "Client name" },
            col_l: { type: "string", description: "Information content" }
          }
        }
      };
      
      const extractResult = await ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: extractionSchema
      });

      if (extractResult.status !== 'success' || !extractResult.output) {
        throw new Error(extractResult.details || "Failed to extract data from CSV.");
      }
      
      // Step 3: Process data with LLM
      setStatusMessage('Processing client data...');
      const llmPrompt = `You are processing CSV data with three columns:
- col_e: Information type/name 
- col_f: Client name
- col_l: Information content

The raw data is:
${JSON.stringify(extractResult.output)}

Group this data by client name (col_f). For each client, combine all their information into a single key information document.

Return a JSON object with key "clients" containing an array of client objects. Each client object should have:
- name: the client name from col_f
- key_information: a formatted string combining all col_e and col_l data for that client

Format the key_information as:
"[Information Type]: [Content]
[Information Type]: [Content]
..."

Ignore any rows where col_e, col_f, or col_l are empty. Ensure all clients from the raw data are processed and included in the final array.`;

      const llmResponse = await InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            clients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  key_information: { type: "string" }
                },
                required: ["name", "key_information"]
              }
            }
          },
          required: ["clients"]
        }
      });

      const clientsData = llmResponse.clients;
      if (!Array.isArray(clientsData) || clientsData.length === 0) {
        throw new Error("No valid client data could be processed from the CSV file.");
      }
      
      // Step 4: Create clients and key information documents
      setStatusMessage(`Creating ${clientsData.length} clients and documents...`);
      
      for (const clientData of clientsData) {
        if (!clientData.key_information || !clientData.name) continue;
        
        // Create client
        const newClient = await Client.create({
          name: clientData.name,
          contact_person: 'Imported from CSV',
          email: `${clientData.name.toLowerCase().replace(/\s/g, '_')}@imported.com`
        });

        // Create board for client
        const newBoard = await Board.create({
          title: `${clientData.name} Project`,
          description: `Project board for ${clientData.name}`,
          columns: [
            { id: 'task', title: 'Task', type: 'text', width: 250 },
            { id: 'status', title: 'Status', type: 'status', width: 150, options: { choices: [{ label: 'Not Started', color: '#C4C4C4' }, { label: 'In Progress', color: '#FFCB00' }, { label: 'Done', color: '#00C875' }] } },
            { id: 'assignee', title: 'Assignee', type: 'people', width: 150 },
            { id: 'due_date', title: 'Due Date', type: 'date', width: 120 }
          ],
          groups: [
            { id: 'tasks', title: 'Tasks', color: '#0073EA', collapsed: false }
          ]
        });

        // Update client with board reference
        await Client.update(newClient.id, { board_id: newBoard.id });

        // Create key information document
        await ClientDocument.create({
          client_id: newClient.id,
          board_id: newBoard.id,
          title: 'Key Information & Credentials',
          category: 'key_info',
          content: clientData.key_information
        });
      }

      setStatusMessage(`Import successful! ${clientsData.length} clients created.`);
      onSuccess();
      handleClose();

    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'An unknown error occurred during import.');
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={!isLoading ? handleClose : undefined}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-600" />
            Import Clients from Asana CSV
          </DialogTitle>
          <DialogDescription>
            Upload your CSV export from Asana to automatically create clients and import their key information.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div 
            className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".csv" />
            <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
            </p>
            <p className="text-xs text-gray-500">CSV file from Asana export</p>
          </div>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <File className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading ? 'Importing...' : 'Start Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
