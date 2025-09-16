
import React, { useState, useEffect } from "react";
import { Client } from "@/api/entities";
import { Board } from "@/api/entities";
import { User } from "@/api/entities";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Building2,
  MoreVertical,
  ArrowRight,
  BarChart2,
  Mail,
  Phone,
  Edit,
  User as UserIcon,
  Briefcase,
  Trash2,
  CheckSquare,
  Archive,
  Pause,
  RotateCcw
} from "lucide-react";
import CreateClientModal from "../components/clients/CreateClientModal";
import EditClientModal from "../components/clients/EditClientModal";
import { clientBoardTemplate } from "../components/templates/ClientBoardTemplate";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]); // Store all clients for filtering
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // New state for status filter
  const [boards, setBoards] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Filter clients when status filter or search changes
  useEffect(() => {
    let filtered = allClients;

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter(c => c.status === "active" || !c.status); // Include clients without status set
    } else if (statusFilter === "snoozed") {
      filtered = filtered.filter(c => c.status === "snoozed");
    } else if (statusFilter === "archived") {
      filtered = filtered.filter(c => c.status === "archived");
    } else if (statusFilter === "all") {
      // Show all clients
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setClients(filtered);
  }, [allClients, statusFilter, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentUser, clientsData] = await Promise.all([
        User.me(),
        Client.list('-updated_date')
      ]);
      setUser(currentUser);
      setAllClients(clientsData); // Store all clients
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };
  
  const handleCreateClient = async (clientData) => {
    setIsLoading(true);
    try {
      // 1. Create the client first, adding the company name
      const newClient = await Client.create({
        ...clientData,
        company_name: user.company_name,
      });
      
      // 2. Create a dedicated board for this new client using template and without ' Project' suffix
      const boardTitle = newClient.name;

      const newBoardData = { ...clientBoardTemplate };
      delete newBoardData.groups; // Ensure no groups are created

      const newBoard = await Board.create({
        ...newBoardData,
        title: boardTitle,
        description: `Tasks and workflow for ${newClient.name}`,
        color: newClient.color || '#0073EA',
        company_name: user.company_name,
      });

      // 3. Update the client record with the new board_id
      const updatedClient = await Client.update(newClient.id, { board_id: newBoard.id });

      setAllClients(prev => [updatedClient, ...prev]);
      setBoards(prev => [...prev, newBoard]);
      
      setShowCreateModal(false);
      navigate(createPageUrl(`Board?id=${newBoard.id}`));

    } catch (error) {
      console.error("Error creating client and board:", error);
      alert(`Failed to create client: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  const handleUpdateClient = async (updatedData) => {
    setIsLoading(true);
    try {
      const response = await Client.update(editingClient.id, updatedData);
      setAllClients(prev => prev.map(c => 
        c.id === editingClient.id ? { ...c, ...response } : c
      ));
      setShowEditModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error updating client:', error);
      alert(`Failed to update client: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await Client.delete(clientId);
        setAllClients(prev => prev.filter(c => c.id !== clientId));
      } catch (error) {
        console.error('Error deleting client:', error);
        alert(`Failed to delete client: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleArchiveClient = async (clientId) => {
    if (window.confirm('Are you sure you want to archive this client? They will be moved to the archived view.')) {
      setIsLoading(true);
      try {
        await Client.update(clientId, { status: 'archived' });
        setAllClients(prev => prev.map(c => 
          c.id === clientId ? { ...c, status: 'archived' } : c
        ));
      } catch (error) {
        console.error('Error archiving client:', error);
        alert(`Failed to archive client: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSnoozeClient = async (clientId) => {
    if (window.confirm('Are you sure you want to snooze this client? They will be moved to the snoozed view.')) {
      setIsLoading(true);
      try {
        await Client.update(clientId, { status: 'snoozed' });
        setAllClients(prev => prev.map(c => 
          c.id === clientId ? { ...c, status: 'snoozed' } : c
        ));
      } catch (error) {
        console.error('Error snoozing client:', error);
        alert(`Failed to snooze client: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestoreClient = async (clientId) => {
    setIsLoading(true);
    try {
      await Client.update(clientId, { status: 'active' });
      setAllClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, status: 'active' } : c
      ));
    } catch (error) {
      console.error('Error restoring client:', error);
      alert(`Failed to restore client: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'snoozed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Snoozed</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
    }
  };

  const getStatusCounts = () => {
    const active = allClients.filter(c => c.status === 'active' || !c.status).length;
    const snoozed = allClients.filter(c => c.status === 'snoozed').length;
    const archived = allClients.filter(c => c.status === 'archived').length;
    return { active, snoozed, archived, total: allClients.length };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return <div>Loading clients...</div>;
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#323338]">Clients</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-white border-gray-300"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                <SelectItem value="snoozed">Snoozed ({statusCounts.snoozed})</SelectItem>
                <SelectItem value="archived">Archived ({statusCounts.archived})</SelectItem>
                <SelectItem value="all">All Clients ({statusCounts.total})</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card
              key={client.id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${
                client.status === 'archived' ? 'opacity-75' : ''
              } ${client.status === 'snoozed' ? 'opacity-90' : ''}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  {client.avatar_url ? (
                    <img
                      src={client.avatar_url}
                      alt={`${client.name} logo`}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: client.color || '#0073EA' }}
                    >
                      {client.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg font-semibold text-[#323338]">{client.name}</CardTitle>
                    {client.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">{client.description}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClient(client)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Client
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate(createPageUrl(`ClientDetail?id=${client.id}`))}
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {client.board_id && (
                      <DropdownMenuItem 
                        onClick={() => navigate(createPageUrl(`Board?id=${client.board_id}`))}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        View Tasks
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {client.status === 'active' || !client.status ? (
                      <>
                        <DropdownMenuItem onClick={() => handleSnoozeClient(client.id)}>
                          <Pause className="w-4 h-4 mr-2" />
                          Snooze Client
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveClient(client.id)}>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Client
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => handleRestoreClient(client.id)}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore Client
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 focus:bg-red-50 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {/* Status Badge */}
                <div className="mb-3">
                  {getStatusBadge(client.status)}
                </div>

                {/* Contact Information Display */}
                <div className="text-sm text-gray-600 space-y-2">
                   {client.email && (
                     <div className="flex items-center gap-2">
                       <Mail className="w-4 h-4 text-gray-400" />
                       <span className="truncate">{client.email}</span>
                     </div>
                   )}
                   {client.phone && (
                     <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-gray-400" />
                       <span>{client.phone}</span>
                     </div>
                   )}
                   {!client.email && !client.phone && (
                     <div className="text-gray-400 italic text-xs">
                       No contact information
                     </div>
                   )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between gap-2">
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => navigate(createPageUrl(`ClientDetail?id=${client.id}`))}
                     className="flex-1"
                   >
                     <UserIcon className="w-3 h-3 mr-2" />
                     View Details
                   </Button>
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => navigate(createPageUrl(`ClientTasks?id=${client.id}`))}
                     className="flex-1"
                   >
                     <CheckSquare className="w-3 h-3 mr-2" />
                     View Tasks
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {clients.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">
              {statusFilter === 'active' ? 'No active clients found' :
               statusFilter === 'snoozed' ? 'No snoozed clients found' :
               statusFilter === 'archived' ? 'No archived clients found' :
               'No clients found'}
            </h3>
            <p className="mt-1">
              {statusFilter === 'active' ? 'Create your first client to get started.' :
               statusFilter === 'snoozed' ? 'No clients are currently snoozed.' :
               statusFilter === 'archived' ? 'No clients have been archived yet.' :
               'Try adjusting your search or filters.'}
            </p>
          </div>
        )}
      </div>

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
      />

      {editingClient && (
        <EditClientModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          onUpdate={handleUpdateClient}
          client={editingClient}
        />
      )}
    </div>
  );
}
