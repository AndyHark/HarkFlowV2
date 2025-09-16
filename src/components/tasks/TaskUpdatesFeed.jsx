import React, { useState, useEffect, useRef } from 'react';
import { TaskUpdate } from '@/api/entities';
import { User } from '@/api/entities';
import UpdateBubble from './UpdateBubble';
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Paperclip, Send, X, Loader2, AtSign } from 'lucide-react';

export default function TaskUpdatesFeed({ task }) {
  const [updates, setUpdates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const [newUpdate, setNewUpdate] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    const loadUpdatesAndUsers = async () => {
      setIsLoading(true);
      try {
        const [updatesData, userData, allUsersData] = await Promise.all([
          TaskUpdate.filter({ task_id: task.id }, '-created_date'),
          User.me(),
          User.list()
        ]);
        
        setUpdates(updatesData);
        setCurrentUser(userData);
        setAllUsers(allUsersData);
      } catch (error) {
        console.error('Error loading task updates:', error);
      }
      setIsLoading(false);
    };

    loadUpdatesAndUsers();
  }, [task.id]);

  const reloadUpdates = async () => {
    try {
      const updatesData = await TaskUpdate.filter({ task_id: task.id }, '-created_date');
      setUpdates(updatesData);
    } catch (error) {
      console.error('Error reloading updates:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newUploadingFiles = files.map(file => ({
      id: Math.random().toString(),
      name: file.name,
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadingFile = newUploadingFiles[i];

      try {
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 50 } : f)
        );

        const { file_url } = await UploadFile({ file });

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 100 } : f)
        );

        setAttachedFiles(prev => [...prev, {
          id: uploadingFile.id,
          name: file.name,
          url: file_url
        }]);

        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);

      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
      }
    }

    event.target.value = '';
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setNewUpdate(value);
    setCursorPosition(position);

    // Check for @ mentions
    const beforeCursor = value.substring(0, position);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex === position - 1) {
      // Just typed @
      setShowMentions(true);
      setMentionSearch('');
    } else if (atIndex !== -1 && position > atIndex) {
      // Typing after @
      const searchTerm = beforeCursor.substring(atIndex + 1);
      if (searchTerm.includes(' ')) {
        setShowMentions(false);
      } else {
        setShowMentions(true);
        setMentionSearch(searchTerm.toLowerCase());
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const beforeCursor = newUpdate.substring(0, cursorPosition);
    const afterCursor = newUpdate.substring(cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    const newText = beforeCursor.substring(0, atIndex) + `@${user.full_name} ` + afterCursor;
    setNewUpdate(newText);
    setShowMentions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = atIndex + user.full_name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const user = allUsers.find(u => u.full_name.toLowerCase() === mentionedName.toLowerCase());
      if (user) {
        mentions.push(user.email);
      }
    }

    return mentions;
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name.toLowerCase().includes(mentionSearch)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUpdate.trim() && attachedFiles.length === 0) return;

    setIsPosting(true);
    try {
      const mentions = extractMentions(newUpdate);
      const fileUrls = attachedFiles.map(f => f.url);

      await TaskUpdate.create({
        task_id: task.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        content: newUpdate.trim(),
        file_urls: fileUrls,
        mentions: mentions
      });

      // Reset form
      setNewUpdate('');
      setAttachedFiles([]);
      setShowMentions(false);
      
      // Reload updates
      reloadUpdates();
    } catch (error) {
      console.error('Error posting update:', error);
    }
    setIsPosting(false);
  };

  const removeAttachedFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Activity</h3>
      
      {/* New Update Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newUpdate}
            onChange={handleTextChange}
            placeholder="Write an update, @mention a user..."
            className="min-h-[80px] resize-none"
            disabled={isPosting}
          />
          
          {/* Mentions Dropdown */}
          {showMentions && (
            <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.slice(0, 5).map(user => (
                  <div
                    key={user.email}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => insertMention(user)}
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm">{user.full_name}</span>
                  </div>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">No users found</div>
              )}
            </div>
          )}
        </div>

        {/* File Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-1">
            {uploadingFiles.map(file => (
              <div key={file.id} className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Uploading {file.name}... {file.progress}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Attached Files */}
        {attachedFiles.length > 0 && (
          <div className="space-y-1">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-100 rounded text-sm">
                <span className="truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachedFile(file.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
              id="update-file-upload"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('update-file-upload')?.click()}
              disabled={isPosting}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={(!newUpdate.trim() && attachedFiles.length === 0) || isPosting}
            size="sm"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Updates List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : updates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No updates for this task yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map(update => (
            <UpdateBubble key={update.id} update={update} />
          ))}
        </div>
      )}
    </div>
  );
}