import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Send,
  Bot,
  User,
  FileText,
  Upload,
  Trash2,
  Download,
  Mail,
  MessageSquare,
  PenTool,
  Lightbulb,
  Zap,
  Brain,
  BookOpen,
  Building2,
  Plus,
  Search,
  Pin,
  PinOff,
  Edit3,
  MoreHorizontal,
  Clock,
  Star,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { agentSDK } from "@/agents";
import { ClientDocument } from "@/api/entities";
import { ChatConversation } from "@/api/entities";
import { PromptUsage } from "@/api/entities";
import { Client } from "@/api/entities";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmailPreview from '../ai/EmailPreview';
import DynamicPrompts from '../ai/DynamicPrompts';
import MessageBubble from '../ai/MessageBubble';
import { UploadFile, InvokeLLM } from "@/api/integrations";

export default function AIChat({ board, items, isOpen, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [agentConversation, setAgentConversation] = useState(null); // State for the SDK's conversation object
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [client, setClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      if (!board || !board.id) {
        console.warn("AIChat: Board data is not available yet.");
        setIsDataLoading(false);
        return;
      }

      const clients = await Client.filter({ board_id: board.id });
      if (clients && clients.length > 0) {
        const currentClient = clients[0];
        setClient(currentClient);
        const docs = await ClientDocument.filter({ client_id: currentClient.id }, '-created_date');
        setKnowledgeBase(docs);
      } else {
        setClient(null);
        setKnowledgeBase([]);
      }

      const convos = await ChatConversation.filter({ board_id: board.id }, '-last_message_at');
      setConversations(convos);

      if (convos.length > 0) {
        let convoToSelect = null;
        if(currentConversation) {
            // Try to find the same conversation in the new list to keep it selected
            convoToSelect = convos.find(c => c.id === currentConversation.id);
        }
        
        // If not found or none was selected, default to the latest
        if(!convoToSelect) {
            convoToSelect = convos[0];
        }

        setCurrentConversation(convoToSelect);
        if (convoToSelect.agent_conversation_id) {
          const agentConvo = await agentSDK.getConversation(convoToSelect.agent_conversation_id);
          setAgentConversation(agentConvo);
        }
      } else {
        setCurrentConversation(null);
        setAgentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [board, currentConversation?.id]); // Depend on board and currentConversation.id

  useEffect(() => {
    if (isOpen && board) {
      loadData();
    } else {
      setClient(null);
      setConversations([]);
      setCurrentConversation(null);
      setAgentConversation(null); // Clear agent conversation
      setMessages([]);
      setIsLoading(false);
      setAttachedFiles([]);
      setUploadingFiles([]);
    }
  }, [isOpen, board, loadData]);

  useEffect(() => {
    if (currentConversation?.agent_conversation_id) {
      const unsubscribe = agentSDK.subscribeToConversation(
        currentConversation.agent_conversation_id,
        (data) => {
          setAgentConversation(data); // Always update with the latest conversation object
          setMessages(data.messages);
          setIsLoading(data.status === 'running' || data.status === 'in_progress');
        }
      );
      return () => {
        setIsLoading(false);
        unsubscribe();
      };
    } else {
      setMessages([]);
      setIsLoading(false);
    }
  }, [currentConversation?.id, currentConversation?.agent_conversation_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateConversationTitle = (firstMessage) => {
    const title = firstMessage.length > 50
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    return title || 'New Conversation';
  };

  const createNewConversation = async (initialMessage = '') => {
    const title = 'New Chat';

    const agentConvo = await agentSDK.createConversation({
      agent_name: "client_manager_agent",
      metadata: { client_id: client?.id, board_id: board?.id },
    });

    const newConvo = await ChatConversation.create({
      board_id: board.id,
      client_id: client?.id,
      title,
      agent_conversation_id: agentConvo.id,
      messages: [],
      last_message_at: new Date().toISOString(),
      is_pinned: false,
      tags: []
    });

    setConversations(prev => [newConvo, ...prev]);
    setCurrentConversation(newConvo);
    setAgentConversation(agentConvo); // Set the agent conversation object
    setMessages([]);

    return { newConvo, agentConvo };
  };

  const getAITrainingContext = async (clientId) => {
    if (!clientId) return '';
    try {
      const allDocs = await ClientDocument.filter({ client_id: clientId });
      const trainingDocs = allDocs.filter(doc => doc.category?.startsWith('ai_training_'));

      if (trainingDocs.length === 0) return '';

      let context = "--- AI TRAINING CONTEXT ---\n";
      context += "Use the following information to answer the user's request. This context provides specific guidelines, policies, and information for this client.\n\n";

      trainingCategories.forEach(categoryInfo => {
        const doc = trainingDocs.find(d => d.category === `ai_training_${categoryInfo.id}`);
        if (doc && doc.content?.trim()) {
          context += `## ${categoryInfo.title}\n`;
          context += `${doc.content}\n\n`;
        }
      });
      
      context += "--- END OF AI TRAINING CONTEXT ---\n\n";
      return context;
    } catch (error) {
      console.error("Error fetching AI training context:", error);
      return '';
    }
  };

  const recordPromptUsage = async (clientId, prompt) => {
    if (!clientId || !prompt?.id) return;
    try {
      const existing = await PromptUsage.filter({ client_id: clientId, template_id: prompt.id }, null, 1);
      if (existing.length > 0) {
        await PromptUsage.update(existing[0].id, {
          usage_count: (existing[0].usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        });
      } else {
        await PromptUsage.create({
          client_id: clientId,
          template_id: prompt.id,
          prompt_text: prompt.prompt,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to record prompt usage:", error);
    }
  };

  const isProjectRelatedQuery = (messageText) => {
    const projectKeywords = [
      'task', 'tasks', 'project', 'client', 'deadline', 'due', 'assigned', 'status',
      'email', 'proposal', 'update', 'progress', 'timeline', 'meeting', 'document',
      'retainer', 'hours', 'time', 'billing', 'invoice', 'report'
    ];
    
    const codingKeywords = [
      'code', 'html', 'css', 'javascript', 'shopify', 'liquid', 'function', 'variable',
      'array', 'object', 'loop', 'conditional', 'api', 'json', 'debug', 'syntax',
      'template', 'component', 'react', 'nodejs', 'python', 'sql', 'express', 'vue', 'angular', 'web development', 'frontend', 'backend', 'fullstack', 'database'
    ];

    const lowerMessage = messageText.toLowerCase();
    
    const mentionsClient = client && client.name && lowerMessage.includes(client.name.toLowerCase());
    
    const hasProjectKeywords = projectKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasCodingKeywords = codingKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (mentionsClient || (hasProjectKeywords && !hasCodingKeywords)) {
      return true;
    }
    
    if (hasCodingKeywords && !hasProjectKeywords) {
      return false;
    }
    
    return true; 
  };

  const handleSendMessage = async (message = currentMessage, template = null) => {
    if (!message.trim() && !template && attachedFiles.length === 0) return;

    let activeConversationEntity = currentConversation;
    let activeAgentConversation = agentConversation;
    
    const isNewChat = !activeConversationEntity || activeConversationEntity.title === 'New Chat';
    
    const messageToSend = message || template?.prompt || '';
    const filesToSend = Array.isArray(attachedFiles) ? [...attachedFiles] : [];

    if (!activeConversationEntity) {
        const { newConvo, agentConvo } = await createNewConversation();
        activeConversationEntity = newConvo;
        activeAgentConversation = agentConvo;
    }

    if (!activeAgentConversation) {
        alert("Agent conversation is not ready. Please try again.");
        return;
    }
    
    setCurrentMessage('');
    setAttachedFiles([]);

    try {
      if (template && client?.id) {
        await recordPromptUsage(client.id, template);
      }
      
      let finalMessageContent = messageToSend;
      const isProjectQuery = isProjectRelatedQuery(messageToSend);

      if (isProjectQuery && client?.id) {
        const trainingContext = await getAITrainingContext(client.id);
        finalMessageContent = `${trainingContext}User Question: ${messageToSend}`;
      } else if (!isProjectQuery) {
        finalMessageContent = `IMPORTANT: This is a general coding/creative question. Act as an expert technical assistant and pair programmer. Provide direct, helpful answers with code examples when appropriate. If asked for code, provide it in markdown code blocks. Don't try to relate this to project management tasks.\n\nUser Question: ${messageToSend}`;
      }

      const fileUrls = filesToSend
          .filter(f => f && f.url)
          .map(f => f.url);

      const messagePayload = {
        role: "user",
        content: finalMessageContent,
        file_urls: fileUrls
      };
      
      await agentSDK.addMessage(activeAgentConversation, messagePayload);
      
      const conversationId = activeConversationEntity.id;

      if (isNewChat) {
        try {
            const result = await InvokeLLM({
                prompt: `Based on the following user query, create a concise and descriptive chat title, no more than 5 words. Do not use quotes in the title.\n\nUser Query: "${messageToSend}"`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "A concise, 5-word-max title for the chat." }
                    }
                }
            });

            const newTitle = result?.title || generateConversationTitle(messageToSend);
            await ChatConversation.update(conversationId, { title: newTitle, last_message_at: new Date().toISOString() });
            loadData(); // Reload to get the new title and re-sort
        } catch (titleError) {
            console.error("AI title generation failed, falling back to default.", titleError);
            const fallbackTitle = generateConversationTitle(messageToSend);
            await ChatConversation.update(conversationId, { title: fallbackTitle, last_message_at: new Date().toISOString() });
            loadData(); // Reload to get the new title and re-sort
        }
      } else {
        await ChatConversation.update(conversationId, { last_message_at: new Date().toISOString() });
        // Optimistically update timestamp to reorder list
        setConversations(prev => 
            prev.map(c => c.id === conversationId ? {...c, last_message_at: new Date().toISOString()} : c)
            .sort((a,b) => new Date(b.last_message_at) - new Date(a.last_message_at))
        );
      }
      
    } catch (error) {
      console.error('Error calling agent:', error);
      alert(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt.prompt, prompt);
  };

  const handleSelectConversation = (conversation) => {
    if (conversation.id === currentConversation?.id) return;
    setCurrentConversation(conversation);
    setAttachedFiles([]);
    setUploadingFiles([]);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    // Optimistically update UI
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);

    try {
      // Delete from DB
      await ChatConversation.delete(conversationId);

      // If we deleted the current conversation, select another or clear the view
      if (currentConversation?.id === conversationId) {
        if (updatedConversations.length > 0) {
          handleSelectConversation(updatedConversations[0]);
        } else {
          setCurrentConversation(null);
          setAgentConversation(null);
          setMessages([]);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // Revert state on error
      loadData();
    }
  };

  const handlePinConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    try {
      await ChatConversation.update(conversationId, {
        is_pinned: !conversation.is_pinned
      });

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, is_pinned: !c.is_pinned }
            : c
        )
      );
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newUploadingFiles = files.map(file => ({
      id: Math.random().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadingFile = newUploadingFiles[i];

      try {
        // Update progress to show uploading
        setUploadingFiles(prev => 
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 50 } : f)
        );

        const { file_url } = await UploadFile({ file });

        // Upload complete
        setUploadingFiles(prev => 
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 100 } : f)
        );

        // Add to attached files
        setAttachedFiles(prev => [...prev, {
          id: uploadingFile.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file_url
        }]);

        // Remove from uploading after a short delay to show 100%
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);

      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    // Clear the input value so the same file can be selected again
    event.target.value = '';
  };

  const removeAttachedFile = (fileId) => {
    setAttachedFiles(prev => Array.isArray(prev) ? prev.filter(f => f.id !== fileId) : []);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 border-l border-[#E1E5F3] flex"
    >
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r border-[#E1E5F3] flex flex-col bg-[#F8F9FA]">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#E1E5F3] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-[#323338]">AI Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              size="icon"
              className="h-9 w-9 bg-blue-600 hover:bg-blue-700"
              onClick={() => createNewConversation()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Client Info */}
        <AnimatePresence>
          {client && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-white border-b border-[#E1E5F3]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: client.color || '#0073EA' }}
                >
                  {client.name.substring(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-[#323338] text-sm">{client.name}</p>
                  <p className="text-xs text-[#676879]">{client.contact_person}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {isDataLoading ? (
            <div className="flex items-center justify-center h-full p-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => createNewConversation()}
                  >
                    Start First Chat
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                        currentConversation?.id === conversation.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-white'
                      }`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {conversation.is_pinned && (
                              <Pin className="w-3 h-3 text-blue-600" />
                            )}
                            <p className="font-medium text-sm text-[#323338] truncate">
                              {conversation.title}
                            </p>
                          </div>
                          <p className="text-xs text-[#676879] mt-1">
                            {conversation.last_message_at && formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handlePinConversation(conversation.id)}>
                              {conversation.is_pinned ? (
                                <>
                                  <PinOff className="w-3 h-3 mr-2" />
                                  Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="w-3 h-3 mr-2" />
                                  Pin
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteConversation(conversation.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isDataLoading ? (
           <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
           </div>
        ) : currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#E1E5F3] bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#323338]">{currentConversation.title}</h3>
                  <p className="text-sm text-[#676879]">
                    {messages.length} messages • Last updated {formatDistanceToNow(new Date(currentConversation.last_message_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-[#0073EA]">
                    <Edit3 className="w-4 h-4 mr-1" />
                    Rename
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.id || index}-${message.timestamp}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <MessageBubble message={message} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                 <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <MessageBubble message={{role: 'assistant', content: 'Flow is thinking...'}} />
                 </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-[#E1E5F3] bg-white space-y-3">
              {/* Quick Templates */}
              <div className="mb-3">
                <DynamicPrompts clientId={client?.id} onPromptClick={handleQuickPrompt} />
              </div>

              {/* File Upload Progress */}
              {uploadingFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {uploadingFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 truncate">{file.name}</p>
                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-blue-600">{file.progress}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Attached Files */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {attachedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <FileText className="w-4 h-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 truncate">{file.name}</p>
                        <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachedFile(file.id)}
                        className="h-6 w-6 text-green-600 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex gap-1">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="h-10 w-10"
                    disabled={isLoading}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask about ${client?.name || 'this project'} or get coding help...`}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={(!currentMessage.trim() && attachedFiles.length === 0) || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#323338] mb-2">Welcome to AI Assistant</h3>
              <p className="text-[#676879] mb-6 max-w-md">
                Start a new conversation to get help with emails, proposals, task planning, and more for {client?.name || board?.title || 'this project'}.
              </p>
              <Button
                onClick={async () => {
                  const { newConvo } = await createNewConversation();
                  if (newConvo) handleSelectConversation(newConvo);
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>

              {/* Quick Templates */}
              <div className="mt-8">
                <p className="text-sm text-[#676879] mb-4">Or choose a template to start:</p>
                <div className="max-w-md mx-auto">
                  <DynamicPrompts
                    clientId={client?.id}
                    onPromptClick={async (prompt) => {
                      await handleSendMessage(prompt.prompt, prompt);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Minimal definition for the helper function
const trainingCategories = [
  { id: 'tone_voice', title: 'Tone of Voice' },
  { id: 'policies', title: 'Policies & Procedures' },
  { id: 'company_info', title: 'Company Information' },
  { id: 'faqs', title: 'Frequently Asked Questions' },
  { id: 'procedures', title: 'Standard Procedures' },
  { id: 'brand_guidelines', title: 'Brand Guidelines' }
];