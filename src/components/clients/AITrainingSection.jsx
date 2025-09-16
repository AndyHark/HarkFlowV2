
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  Save, 
  Trash2, 
  FileText, 
  Upload,
  File, // Used for generic file icon
  Loader2,
  Eye
} from "lucide-react";
import { ClientDocument } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS

const trainingCategories = [
  { id: 'tone_voice', title: 'Tone of Voice', description: 'How the AI should communicate for this client' },
  { id: 'policies', title: 'Policies & Procedures', description: 'Company policies and standard procedures' },
  { id: 'company_info', title: 'Company Information', description: 'About the company, services, and background' },
  { id: 'faqs', title: 'Frequently Asked Questions', description: 'Common questions and their answers' },
  { id: 'procedures', title: 'Standard Procedures', description: 'Step-by-step procedures and workflows' },
  { id: 'brand_guidelines', title: 'Brand Guidelines', description: 'Brand voice, style, and messaging guidelines' }
];

export default function AITrainingSection({ client, documents }) {
  const [trainingDocuments, setTrainingDocuments] = useState({});
  const [isLoading, setIsLoading] = useState(false); // Not used in provided outline, keeping for potential future use
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({});

  const loadTrainingDocuments = useCallback(() => {
    const trainingDocs = {};
    const uploadedTrainingFiles = {};
    
    documents.forEach(doc => {
      if (doc.category?.startsWith('ai_training_')) {
        const categoryId = doc.category.replace('ai_training_', '');
        
        if (doc.content && !doc.file_url) {
          // Text content
          trainingDocs[categoryId] = doc.content;
        } else if (doc.file_url) {
          // Uploaded file
          if (!uploadedTrainingFiles[categoryId]) {
            uploadedTrainingFiles[categoryId] = [];
          }
          uploadedTrainingFiles[categoryId].push(doc);
        }
      }
    });
    
    setTrainingDocuments(trainingDocs);
    setUploadedFiles(uploadedTrainingFiles);
  }, [documents]);

  useEffect(() => {
    loadTrainingDocuments();
  }, [loadTrainingDocuments]);

  // Handler for ReactQuill's onChange
  const handleTextChange = (categoryId, content) => {
    setTrainingDocuments(prev => ({ ...prev, [categoryId]: content }));
  };

  const handleSaveText = async (categoryId, content) => {
    setIsSaving(true);
    try {
      const existingDoc = documents.find(d => 
        d.category === `ai_training_${categoryId}` && 
        d.content && !d.file_url
      );

      // Check if content is empty or only whitespace HTML
      const isContentEmpty = content.replace(/<[^>]*>/g, '').trim() === '';

      if (existingDoc) {
        if (isContentEmpty) {
          // If content becomes empty, delete the existing document
          await ClientDocument.delete(existingDoc.id);
          setTrainingDocuments(prev => {
            const newState = { ...prev };
            delete newState[categoryId];
            return newState;
          });
          toast.success('Training content cleared successfully!');
        } else {
          // Update existing document
          await ClientDocument.update(existingDoc.id, { content });
          setTrainingDocuments(prev => ({ ...prev, [categoryId]: content }));
          toast.success('Training content updated successfully!');
        }
      } else if (!isContentEmpty) {
        // Create new document only if content is not empty
        const categoryInfo = trainingCategories.find(c => c.id === categoryId);
        await ClientDocument.create({
          client_id: client.id,
          board_id: client.board_id,
          title: `AI Training: ${categoryInfo.title}`,
          category: `ai_training_${categoryId}`,
          content: content
        });
        setTrainingDocuments(prev => ({ ...prev, [categoryId]: content }));
        toast.success('Training content saved successfully!');
      } else {
        // No existing content, and new content is empty - do nothing
        toast.info('No content to save or content is empty.');
      }
    } catch (error) {
      console.error('Error saving training content:', error);
      toast.error('Failed to save training content');
    }
    setIsSaving(false);
  };

  const handleFileUpload = async (categoryId, files) => {
    const categoryInfo = trainingCategories.find(c => c.id === categoryId);
    setUploadingFiles(prev => ({ ...prev, [categoryId]: true }));

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { file_url } = await UploadFile({ file });
        
        return ClientDocument.create({
          client_id: client.id,
          board_id: client.board_id,
          title: `${categoryInfo.title}: ${file.name}`,
          category: `ai_training_${categoryId}`,
          file_url: file_url,
          file_type: file.type,
          file_size: file.size
        });
      });

      const newDocs = await Promise.all(uploadPromises);
      
      setUploadedFiles(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), ...newDocs]
      }));
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    }
    
    setUploadingFiles(prev => ({ ...prev, [categoryId]: false }));
  };

  const handleDeleteFile = async (categoryId, docId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await ClientDocument.delete(docId);
      
      setUploadedFiles(prev => ({
        ...prev,
        [categoryId]: prev[categoryId]?.filter(doc => doc.id !== docId) || []
      }));
      
      toast.success('File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
    clipboard: {
      // This setting improves paste handling
      matchVisual: false,
    }
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'blockquote', 'code-block',
    'link'
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Training Data
        </CardTitle>
        <p className="text-sm text-gray-600">
          Train the AI with client-specific information, procedures, and guidelines. You can add both text content and upload files.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {trainingCategories.map((category) => (
          <div key={category.id} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{category.title}</h4>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Text Content</Label>
              <div className="bg-white rounded-lg">
                <ReactQuill
                  theme="snow"
                  value={trainingDocuments[category.id] || ''}
                  onChange={(content) => handleTextChange(category.id, content)}
                  modules={quillModules}
                  formats={quillFormats}
                  className="min-h-32"
                  placeholder={`Add ${category.title.toLowerCase()} information here...`}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveText(category.id, trainingDocuments[category.id] || '')}
                  disabled={isSaving || (trainingDocuments[category.id] || '').replace(/<[^>]*>/g, '').trim() === ''}
                  className="mt-2"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Text'}
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Upload Files</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={(e) => {
                    handleFileUpload(category.id, e.target.files);
                    e.target.value = null; 
                  }}
                  className="hidden"
                  id={`file-upload-${category.id}`}
                />
                <label 
                  htmlFor={`file-upload-${category.id}`}
                  className="cursor-pointer flex flex-col items-center justify-center text-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF, DOC, DOCX, TXT, MD files
                  </span>
                </label>
                
                {uploadingFiles[category.id] && (
                  <div className="mt-2 flex items-center justify-center text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading files...
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles[category.id] && uploadedFiles[category.id].length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Uploaded Files</Label>
                <div className="space-y-2">
                  {uploadedFiles[category.id].map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {file.title.replace(`${category.title}: `, '')}
                          </p>
                          {file.file_size && (
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.file_size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.file_url, '_blank')}
                          className="h-8 w-8 text-gray-400 hover:text-blue-600"
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(category.id, file.id)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
