
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Client } from "@/api/entities";
import { Board } from "@/api/entities";
import { Item } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { ClientRetainer } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  ArrowLeft,
  Briefcase,
  FileText,
  MessageSquare,
  Settings,
  DollarSign,
  Brain,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import AIChat from "../components/board/AIChat";
import KeyInformationSection from "../components/clients/KeyInformationSection";
import RetainerManagement from "../components/clients/RetainerManagement";
import AITrainingSection from "../components/clients/AITrainingSection";
import ClientSettings from "../components/clients/ClientSettings";
import AutomationsPanel from "../components/clients/AutomationsPanel"; // New import

export default function ClientDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('id');
  
  const [client, setClient] = useState(null);
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [retainer, setRetainer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('ClientDetail: Loading data for client ID:', clientId);
      
      // First, load the client data
      const clientData = await Client.get(clientId);
      console.log('ClientDetail: Client data loaded:', clientData);
      
      if (!clientData) {
        setError(`Client with ID "${clientId}" not found`);
        setClient(null);
        setIsLoading(false);
        return;
      }
      
      setClient(clientData);

      // Then load board data using the client's board_id
      let currentBoard = null;
      if (clientData.board_id) {
        try {
          const boardData = await Board.get(clientData.board_id);
          if (boardData) {
            currentBoard = boardData;
            setBoard(currentBoard);
          }
        } catch (boardError) {
          console.warn("Board not found for client:", boardError);
          // Try to find board by title as fallback
          const boardsData = await Board.filter({ title: clientData.name });
          if (boardsData.length > 0) {
            currentBoard = boardsData[0];
            setBoard(currentBoard);
            // Update client with correct board_id
            await Client.update(clientId, { board_id: currentBoard.id });
            setClient(prev => ({ ...prev, board_id: currentBoard.id }));
          }
        }
      } else {
        // No board_id on client, try to find by title
        const boardsData = await Board.filter({ title: clientData.name });
        if (boardsData.length > 0) {
          currentBoard = boardsData[0];
          setBoard(currentBoard);
          // Update client with board_id
          await Client.update(clientId, { board_id: currentBoard.id });
          setClient(prev => ({ ...prev, board_id: currentBoard.id }));
        }
      }

      // Load additional data in parallel now that we have the client and board
      const additionalDataPromises = [];

      if (currentBoard) {
        additionalDataPromises.push(Item.filter({ board_id: currentBoard.id }));
      } else {
        additionalDataPromises.push(Promise.resolve([]));
      }

      additionalDataPromises.push(ClientDocument.filter({ client_id: clientId }));
      additionalDataPromises.push(ClientRetainer.filter({ client_id: clientId, is_active: true }));

      const [tasksData, documentsData, retainerData] = await Promise.all(additionalDataPromises);

      setTasks(tasksData || []);
      setDocuments(documentsData || []);
      
      if (retainerData && retainerData.length > 0) {
        setRetainer(retainerData[0]);
      }

    } catch (error) {
      console.error("Error loading client details:", error);
      setError(`Failed to load client details: ${error.message}`);
      setClient(null);
      setBoard(null);
      setTasks([]);
      setDocuments([]);
      setRetainer(null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    console.log('ClientDetail: URL search params:', Object.fromEntries(searchParams));
    console.log('ClientDetail: Client ID from params:', clientId);
    
    if (!clientId) {
      setError("No client ID found in URL");
      setIsLoading(false);
      return;
    }
    
    if (clientId === 'null' || clientId === 'undefined' || clientId.trim() === '') {
      setError("Invalid client ID in URL");
      setIsLoading(false);
      return;
    }
    
    loadData();
  }, [clientId, searchParams, loadData]);

  const getTaskStatus = (task) => {
    if (!board) return 'N/A';
    const statusColumn = board.columns?.find(col => col.type === 'status');
    const status = task.data?.[statusColumn?.id] || 'Not Started';
    return status;
  };
  
  const getTaskDueDate = (task) => {
    if (!board) return null;
    const dueDateColumn = board.columns?.find(col => col.type === 'date' && (col.title?.toLowerCase().includes('due') || col.title?.toLowerCase().includes('deadline')));
    return task.data?.[dueDateColumn?.id] || task.data?.due_date;
  };

  const getTaskCompletedDate = (task) => {
    if (!board) return null;
    const completedDateColumn = board.columns?.find(col => col.type === 'date' && (col.title?.toLowerCase().includes('completed') || col.title?.toLowerCase().includes('done')));
    return task.data?.[completedDateColumn?.id] || task.data?.date_completed;
  };

  const getTaskAssignee = (task) => {
    if (!board) return null;
    const assigneeColumn = board.columns?.find(col => col.type === 'people' || col.title?.toLowerCase().includes('assignee'));
    let assignee = task.data?.[assigneeColumn?.id] || task.data?.assignee;
    
    if (Array.isArray(assignee) && assignee.length > 0) {
      const firstAssignee = assignee[0];
      if (typeof firstAssignee === 'string' && firstAssignee.includes('@')) {
        return firstAssignee.split('@')[0];
      }
      return firstAssignee;
    }
    if (typeof assignee === 'string' && assignee.includes('@')) {
      return assignee.split('@')[0];
    }
    return assignee;
  };

  const isCompleted = (task) => {
    const status = getTaskStatus(task)?.toLowerCase();
    const completedDate = getTaskCompletedDate(task);
    // A task is considered completed if its status is 'done' OR if it has a completed date.
    return status === 'done' || status === 'completed' || status === 'complete' || !!completedDate;
  };

  const handleRetainerUpdate = (updatedRetainer) => {
    setRetainer(updatedRetainer);
  };

  const handleClientUpdate = async (updatedData) => {
    if (!client) return;
    try {
      const updatedClient = await Client.update(client.id, updatedData);
      setClient(prev => ({ ...prev, ...updatedClient }));
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0073EA] mx-auto mb-4"></div>
          <p className="text-lg text-[#323338]">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#323338] mb-4">
            {error || "Client not found"}
          </h2>
          <p className="text-[#676879] mb-6">
            {error ? 
              "There was an issue loading the client details. Please check the URL and try again." :
              "The client you are looking for does not exist or could not be loaded."
            }
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Debug info: Client ID = "{clientId}"
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button 
                onClick={() => navigate('/Clients')}
                className="bg-[#0073EA] hover:bg-[#0056B3]"
              >
                <Building2 className="w-4 h-4 mr-2" />
                View All Clients
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate('/Clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Clients
          </Button>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-3xl"
              style={{ backgroundColor: client.color || '#0073EA' }}
            >
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#323338]">{client.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                {client.email && (
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {client.email}</span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {client.phone}</span>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-600">
                    <Globe className="w-4 h-4" /> {client.website}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks"><Briefcase className="w-4 h-4 mr-2" />Tasks</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" />Documents</TabsTrigger>
            <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2" />AI Chat</TabsTrigger>
            <TabsTrigger value="ai-training"><Brain className="w-4 h-4 mr-2" />AI Training</TabsTrigger>
            <TabsTrigger value="automations"><Settings className="w-4 h-4 mr-2" />Automations</TabsTrigger>
            <TabsTrigger value="retainer"><DollarSign className="w-4 h-4 mr-2" />Retainer</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map(task => {
                      const completed = isCompleted(task);
                      const status = completed ? 'Completed' : getTaskStatus(task);
                      const dueDate = getTaskDueDate(task);
                      const completedDate = getTaskCompletedDate(task);
                      const assignee = getTaskAssignee(task);

                      return (
                        <div key={task.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium mb-1 ${completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <Badge variant={completed ? "default" : "secondary"} className={completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                {status}
                              </Badge>
                              {assignee && (
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="w-3.5 h-3.5" /> {assignee}
                                </div>
                              )}
                              {dueDate && !completed && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" /> Due {format(parseISO(dueDate), 'MMM d')}
                                </div>
                              )}
                              {completedDate && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Completed {format(parseISO(completedDate), 'MMM d')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No tasks found for this client.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-6">
             <KeyInformationSection 
               documents={documents} 
               client={client} 
               onClientUpdate={handleClientUpdate}
             />
          </TabsContent>
          
          <TabsContent value="chat" className="mt-6">
             {board ? (
                <AIChat client={client} board={board} />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p>AI Chat requires a board to be linked to this client.</p>
                    <Button className="mt-4" onClick={loadData}>
                      <Briefcase className="w-4 h-4 mr-2" />
                      Try to Link Board
                    </Button>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="ai-training" className="mt-6">
            <AITrainingSection client={client} documents={documents} />
          </TabsContent>

          <TabsContent value="automations" className="mt-6">
            <AutomationsPanel client={client} onClientUpdate={handleClientUpdate} />
          </TabsContent>
          
          <TabsContent value="retainer" className="mt-6">
            <RetainerManagement client={client} onRetainerUpdate={handleRetainerUpdate} />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6">
            <ClientSettings client={client} onClientUpdate={handleClientUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
