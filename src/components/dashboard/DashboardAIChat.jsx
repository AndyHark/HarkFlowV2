
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import {
  Send,
  Bot,
  User,
  Mail,
  FileText,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Loader2,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { agentSDK } from "@/agents";
import { ChatConversation } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { PromptUsage } from "@/api/entities";
import { format, formatDistanceToNow } from "date-fns";
import EmailPreview from "../ai/EmailPreview";
import DynamicPrompts from "../ai/DynamicPrompts";
import MessageBubble from "../ai/MessageBubble";
import { UploadFile, InvokeLLM } from "@/api/integrations";

export default function DashboardAIChat({ selectedClient, clients, boards, assignedTasks, user }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null); // This is my ChatConversation entity
  const [agentConversation, setAgentConversation] = useState(null); // State for the SDK's conversation object
  const messagesEndRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState([]); // New state for tracking file upload progress
  const [attachedFiles, setAttachedFiles] = useState([]); // New state for files attached to the current message
  const [allConversations, setAllConversations] = useState([]); // State for all conversations
  const [showConversationsSidebar, setShowConversationsSidebar] = useState(true); // State for sidebar visibility

  useEffect(() => {
    if (conversation?.agent_conversation_id) {
      const unsubscribe = agentSDK.subscribeToConversation(
        conversation.agent_conversation_id,
        (data) => {
          setAgentConversation(data); // Always update with the latest conversation object
          setMessages(data.messages);
          setIsLoading(data.status === 'running');
        }
      );
      return () => unsubscribe();
    }
    // If conversation is null but agentConversation exists (new chat),
    // we still want to subscribe to the agentConversation directly if it's new and awaiting first message.
    // However, the current agentSDK.subscribeToConversation requires a conversation.agent_conversation_id
    // which implies it expects a persistent DB conversation.
    // For a new chat not yet saved to DB, agentSDK.addMessage implicitly handles the subscription.
    // So, this effect should primarily handle existing DB conversations.
  }, [conversation?.id, conversation?.agent_conversation_id]);

  const loadClientData = useCallback(async () => {
    if (!selectedClient) return;

    setIsLoading(true);
    setMessages([]); // Clear messages before loading new ones
    setConversation(null); // Clear current conversation to ensure clean state
    setAgentConversation(null); // Clear agent conversation
    setAllConversations([]); // Clear all conversations

    try {
        const client = clients.find(c => c.id === selectedClient);
        const board = boards.find(b => b.id === client?.board_id);

        const allConversationsData = await ChatConversation.filter({
            client_id: selectedClient,
            board_id: board?.id,
        }, '-last_message_at');
        setAllConversations(allConversationsData);

        let conversationLoaded = false;
        if (allConversationsData.length > 0) {
            const mostRecent = allConversationsData[0];
            // FIX: Add a guard to ensure agent_conversation_id exists before loading
            if (mostRecent.agent_conversation_id) {
                try {
                    const agentConvo = await agentSDK.getConversation(mostRecent.agent_conversation_id);
                    setConversation(mostRecent);
                    setAgentConversation(agentConvo);
                    setMessages(agentConvo.messages || []);
                    conversationLoaded = true;
                } catch (e) {
                    console.error("Failed to load a specific agent conversation (ID:", mostRecent.agent_conversation_id, "). Starting a new one.", e);
                    // This conversation is likely corrupt or doesn't exist on the agent SDK.
                    // Let conversationLoaded remain false to trigger new conversation creation.
                }
            }
        }

        // If no valid conversation was loaded (either no previous conversations, or the existing one failed to load),
        // prepare for a new one.
        if (!conversationLoaded) {
            // Create the agentSDK conversation here, but the ChatConversation entity is created on first message.
            const agentConvo = await agentSDK.createConversation({
                agent_name: "client_manager_agent",
                metadata: { client_id: selectedClient, board_id: board?.id },
            });
            setConversation(null); // No DB conversation yet
            setAgentConversation(agentConvo);
            setMessages([]); // New chat starts with no messages
        }
    } catch (error) {
        console.error('Error loading client chat data:', error);
        setMessages([{ id: 'error', role: 'assistant', content: 'Failed to load chat history.', timestamp: new Date().toISOString() }]);
    } finally {
        setIsLoading(false);
    }
  }, [selectedClient, clients, boards]);


  useEffect(() => {
    if (selectedClient) {
      loadClientData();
    } else {
      setConversation(null);
      setAgentConversation(null); // Clear agent conversation
      setMessages([]);
      setAttachedFiles([]); // Clear attached files on client change
      setUploadingFiles([]); // Clear uploading files on client change
      setAllConversations([]); // Clear all conversations on client change
    }
  }, [selectedClient, loadClientData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectConversation = async (selectedConversation) => {
    if (selectedConversation.id === conversation?.id) return; // Already selected
    if (!selectedConversation.agent_conversation_id) {
      console.warn("Attempted to select a conversation without an agent_conversation_id:", selectedConversation);
      alert("This conversation cannot be loaded as it's missing vital information. Please select another or start a new chat.");
      return;
    }

    setMessages([]);
    setIsLoading(true);

    try {
      const agentConvo = await agentSDK.getConversation(selectedConversation.agent_conversation_id);
      setConversation(selectedConversation);
      setAgentConversation(agentConvo);
      setMessages(agentConvo.messages || []);
    } catch (error) {
      console.error('Error loading selected conversation:', error);
      setMessages([{ id: 'error', role: 'assistant', content: 'Failed to load this conversation. It might be corrupted or deleted from the AI service.', timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewConversation = async () => {
    if (!selectedClient) return;

    setIsLoading(true);
    setMessages([]); // Clear messages for new conversation

    const client = clients.find(c => c.id === selectedClient);
    const board = boards.find(b => b.id === client?.board_id);

    try {
      const agentConvo = await agentSDK.createConversation({
        agent_name: "client_manager_agent",
        metadata: { client_id: selectedClient, board_id: board?.id },
      });

      // Just reset the state, don't create the ChatConversation entity here
      setConversation(null); // Indicate no DB entity yet
      setAgentConversation(agentConvo);
      setMessages([]); // New conversation starts fresh
      // No need to update allConversations until the first message is sent
    } catch (error) {
      console.error('Error preparing new conversation:', error);
      alert('Failed to start a new chat.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId, event) => {
    event.stopPropagation(); // Prevent selecting the conversation when clicking delete button

    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;

    // Immediately update the UI for a responsive feel
    const updatedConversations = allConversations.filter(c => c.id !== conversationId);
    setAllConversations(updatedConversations);

    try {
      await ChatConversation.delete(conversationId);

      // If we deleted the current conversation, select another or create new
      if (conversation?.id === conversationId) {
        if (updatedConversations.length > 0) {
          // Attempt to select the first remaining conversation
          await handleSelectConversation(updatedConversations[0]);
        } else {
          // If no conversations remain, create a new one
          await handleCreateNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. The conversation may reappear.');
      // If error, reload to get the correct state from the server
      loadClientData();
    }
  };

  const getAITrainingContext = async (clientId) => {
    if (!clientId) return '';

    try {
      // Fetch all documents and then filter, as the SDK might not support complex queries.
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
      const existing = await PromptUsage.filter({
        client_id: clientId,
        template_id: prompt.id,
      }, null, 1);

      if (existing.length > 0) {
        const usage = existing[0];
        await PromptUsage.update(usage.id, {
          usage_count: (usage.usage_count || 0) + 1,
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
      'retainer', 'hours', 'time', 'billing', 'invoice', 'report', 'send', 'find', 'create',
      'complete', 'log', 'search for'
    ];

    const lowerMessage = messageText.toLowerCase();

    // Explicitly check for project-related keywords
    if (projectKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    // If it mentions a client's name and is a short query, it's likely about the project.
    const mentionsClient = clients.some(client =>
      client.name && lowerMessage.includes(client.name.toLowerCase())
    );
    if (mentionsClient && lowerMessage.split(' ').length < 10) {
        return true;
    }

    // Default to a general, creative query if no strong project signals are found.
    return false;
  };

  const handleSendMessage = async (messageText = message, isQuickPrompt = false, template = null) => {
    if (!messageText.trim() && attachedFiles.length === 0) return;
    if (!agentConversation) {
        alert("Conversation is not ready, please wait a moment.");
        return;
    }

    // Add user's message to the UI immediately for a responsive feel
    // The subscription will later overwrite this with the message from the agent's perspective,
    // but the content sent to the agent is what matters for processing.
    const userMessageForDisplay = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      file_urls: attachedFiles.map(f => f.url)
    };
    setMessages(prev => [...prev, userMessageForDisplay]);

    let currentConversation = conversation; // This will be null if it's a new chat session
    const isNewConversation = !currentConversation;

    const filesToSend = Array.isArray(attachedFiles) ? [...attachedFiles] : [];
    setMessage('');
    setAttachedFiles([]); // Clear attached files after sending

    try {
      if (template) {
        await recordPromptUsage(selectedClient, template);
      }

      // If it's the first message in a new session, create the ChatConversation entity now
      if (isNewConversation) {
        const client = clients.find(c => c.id === selectedClient);
        const board = boards.find(b => b.id === client?.board_id);

        const tempTitle = messageText.substring(0, 40) + (messageText.length > 40 ? '...' : '');

        const newDbConv = await ChatConversation.create({
          board_id: board?.id,
          client_id: selectedClient,
          title: tempTitle, // Temporary title, will be updated by AI if successful
          agent_conversation_id: agentConversation.id, // Link to the existing agent conversation
          last_message_at: new Date().toISOString(),
          messages: [], // No messages stored here, they are in agentConversation
          company_name: user?.company_name, // Add company_name from the user prop
        });

        currentConversation = newDbConv;
        setConversation(currentConversation); // Update local state with the new DB conversation
        // Add new conversation to the top of the list for immediate display
        setAllConversations(prev => [currentConversation, ...prev].sort((a,b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
      }

      let finalMessageContent = messageText;
      const isProjectQuery = isProjectRelatedQuery(messageText);

      // If it's a project query, prepend the training context.
      // Otherwise, send the message as is, letting the agent's new, more general instructions take over.
      if (isProjectQuery && selectedClient) {
        const trainingContext = await getAITrainingContext(selectedClient);
        finalMessageContent = `${trainingContext}User Question: ${messageText}`;
      }

      const fileUrls = filesToSend
          .filter(f => f && f.url) // Ensure each file has a valid URL
          .map(f => f.url);

      // Build the message payload
      const messagePayload = {
        role: "user",
        content: finalMessageContent,
        file_urls: fileUrls // Always pass an array, even if empty
      };

      // Pass the full agentConversation object, not just the ID
      await agentSDK.addMessage(agentConversation, messagePayload);

      // AI-powered title generation for new chats
      if (isNewConversation && currentConversation) { // Only for truly new conversations
        try {
            const result = await InvokeLLM({
                prompt: `Based on the following user query, create a concise and descriptive chat title, no more than 5 words. Do not use quotes in the title.\n\nUser Query: "${messageText}"`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "A concise, 5-word-max title for the chat." }
                    }
                }
            });

            const newTitle = result?.title;
            if (newTitle) {
                await ChatConversation.update(currentConversation.id, { title: newTitle });

                // Update local state to reflect the new title immediately
                const updatedConversation = { ...currentConversation, title: newTitle };
                setConversation(updatedConversation);
                setAllConversations(prev => prev.map(c =>
                    c.id === currentConversation.id ? updatedConversation : c
                ));
            }
        } catch (titleError) {
            console.error("Failed to generate AI title:", titleError);
            // Don't block the user flow if title generation fails. It will just keep the default title.
        }
      }

    } catch (error) {
      console.error('Error sending agent message:', error);
      alert(`Error: ${error.message}`);
      // Manually add an error message if the API call fails.
      setIsLoading(false); // Reset loading on error
      setMessages(prevMessages => [...prevMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error sending your message. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleQuickPrompt = (prompt) => {
    if (prompt.type === 'interactive') {
      const userInput = window.prompt(prompt.question);
      if (userInput && userInput.trim() !== '') {
        const finalMessage = `${prompt.basePrompt} ${userInput}`;
        handleSendMessage(finalMessage, true, prompt);
      }
    } else { // 'static' prompt
      handleSendMessage(prompt.prompt, true, prompt);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newUploadingFiles = files.map(file => ({
      id: Math.random().toString(), // Unique ID for tracking
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
        // Simulate initial progress or actual upload start
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 50 } : f)
        );

        const { file_url } = await UploadFile({ file }); // Call the actual upload function

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 100 } : f)
        );

        setAttachedFiles(prev => [...prev, {
          id: uploadingFile.id, // Use the same ID for consistency
          name: file.name,
          size: file.size,
          type: file.type,
          url: file_url // Store the returned URL
        }]);

        // Remove from uploading list after a short delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);

      } catch (error) {
        console.error('Error uploading file:', error);
        // Remove from uploading list on error
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    event.target.value = ''; // Clear the input so same file can be selected again
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

  if (!selectedClient) {
    return (
      <div className="text-center py-8">
        <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Select a client to start chatting with AI</p>
      </div>
    );
  }

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <div className="flex h-[calc(100vh-140px)]"> {/* Adjusted height to fit viewport, remove if it breaks layout */}
      {/* Main Chat Area */}
      <div className="flex-1 space-y-4 flex flex-col">
        {/* Context Header */}
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border flex-shrink-0">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedClientData?.color || '#0073EA' }}
          />
          <span className="font-medium text-sm">
            AI Assistant for {selectedClientData?.name}
          </span>
          <Badge variant="outline" className="text-xs">
            {assignedTasks.filter(t => {
              const board = boards.find(b => b.id === t.board_id);
              return board?.id === selectedClientData?.board_id;
            }).length} active tasks
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => setShowConversationsSidebar(!showConversationsSidebar)}
          >
            {showConversationsSidebar ? 'Hide' : 'Show'} Chats
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-grow w-full rounded-lg border bg-white">
          <div className="p-4 space-y-6">
            {!agentConversation || messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-4">
                  Hi! I'm Flow, your AI agent for {selectedClientData?.name}.
                  I can help with tasks, emails, coding, and more.
                </p>
                <DynamicPrompts clientId={selectedClient} onPromptClick={handleQuickPrompt} />
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div
                      key={`${msg.id}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <MessageBubble message={msg} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                   <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <MessageBubble message={{role: 'assistant', content: 'Thinking...'}} />
                   </motion.div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length > 0 && (
          <DynamicPrompts clientId={selectedClient} onPromptClick={handleQuickPrompt} />
        )}

        {/* File Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2 flex-shrink-0">
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
          <div className="space-y-2 flex-shrink-0">
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

        {/* Input */}
        <div className="flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="flex gap-1">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
                onChange={handleFileUpload}
                className="hidden"
                id="dashboard-file-upload"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => document.getElementById('dashboard-file-upload')?.click()}
                className="h-10 w-10"
                disabled={isLoading}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask about ${selectedClientData?.name} or get coding help...`}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Previous Conversations */}
      {showConversationsSidebar && (
        <div className="w-80 ml-4 bg-white rounded-lg border flex flex-col flex-shrink-0">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">Previous Chats</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNewConversation}
                className="h-7 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {allConversations.length} conversation{allConversations.length !== 1 ? 's' : ''} with {selectedClientData?.name}
            </p>
          </div>

          <ScrollArea className="flex-grow"> {/* Use flex-grow to make scroll area fill remaining space */}
            <div className="p-2">
              {allConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No previous conversations</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                        conversation?.id === conv.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
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
