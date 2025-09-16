
import React, { useState, useEffect } from "react";
import { Board } from "@/api/entities";
import { Item } from "@/api/entities";
import { Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  ArrowLeft,
  SortAsc,
  Eye,
  EyeOff
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

import BoardHeader from "../components/board/BoardHeader";
import NewTaskModal from "../components/board/NewTaskModal";
import FilterPanel from "../components/board/FilterPanel";
import SortMenu from "../components/board/SortMenu";
import PersonFilter from "../components/board/PersonFilter";
import HideMenu from "../components/board/HideMenu";
import NewColumnModal from "../components/board/NewColumnModal";
import KanbanView from "../components/board/views/KanbanView";
import CalendarView from "../components/board/views/CalendarView";
import TimelineView from "../components/board/views/TimelineView";

import AnalyticsPanel from "../components/board/analytics/AnalyticsPanel";
import IntegrationsPanel from "../components/board/integrations/IntegrationsPanel";
import AutomationsPanel from "../components/board/automations/AutomationsPanel";
import AIChat from "../components/board/AIChat";

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ItemRow from "../components/board/ItemRow";
import ColumnHeader from "../components/board/ColumnHeader";

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export default function BoardPage() {
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get('id');
  
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentView, setCurrentView] = useState('table');
  
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPersonFilter, setShowPersonFilter] = useState(false);
  const [showHideMenu, setShowHideMenu] = useState(false);
  const [showNewColumnModal, setShowNewColumnModal] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const [filters, setFilters] = useState({
    status: [],
    people: [],
    priority: []
  });
  const [sortBy, setSortBy] = useState('order_index');
  const [sortDirection, setSortDirection] = useState('asc');
  const [hiddenColumns, setHiddenColumns] = useState(new Set());

  useEffect(() => {
    if (boardId && boardId !== 'null' && boardId !== 'undefined') {
      loadBoardAndItems();
    } else {
      setIsLoading(false);
    }
  }, [boardId]);

  const loadBoardAndItems = async () => {
    setIsLoading(true);
    try {
      // Load board first
      const boardResponse = await Board.filter({ id: boardId });
      
      if (boardResponse.length === 0) {
        setBoard(null);
        setClient(null);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const currentBoard = boardResponse[0];
      setBoard(currentBoard);

      // Load items for this board
      const itemsData = await Item.filter({ board_id: currentBoard.id }, "order_index");
      setItems(itemsData);

      // Try to load client using board_id relationship.
      // This is the fix: we filter for a client with the correct board_id.
      // This prevents errors if the client has been deleted.
      try {
        const clientData = await Client.filter({ board_id: currentBoard.id });
        if (clientData.length > 0) {
          setClient(clientData[0]);
        } else {
          setClient(null); // Handle case where no client is associated
        }
      } catch (clientError) {
        console.warn("No client associated with this board:", clientError);
        setClient(null);
      }

    } catch (error) {
      console.error("Error loading board and items:", error);
      setBoard(null);
      setClient(null);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBoardTitle = async (newTitle) => {
    if (!board || !newTitle || newTitle.trim() === board.title) {
      return;
    }
    try {
      const trimmedTitle = newTitle.trim();
      await Board.update(board.id, { title: trimmedTitle });
      setBoard(prevBoard => ({ ...prevBoard, title: trimmedTitle }));
    } catch (error) {
      console.error("Error updating board title:", error);
      // Optionally, add a user-facing error message
    }
  };

  const handleAddItem = async (title) => {
    if (!boardId || !board) return;

    const maxOrder = Math.max(
      0,
      ...items.map(item => item.order_index || 0)
    );

    const newItemData = {};
    if (board.columns) {
      board.columns.forEach(column => {
        if (column.id === 'task') return;

        switch (column.type) {
          case 'text':
            newItemData[column.id] = "";
            break;
          case 'status':
            newItemData[column.id] = column.options?.choices?.[0]?.label || null;
            break;
          case 'date':
            newItemData[column.id] = null;
            break;
          case 'people':
            newItemData[column.id] = null;
            break;
          case 'number':
            newItemData[column.id] = null;
            break;
          case 'tags':
            newItemData[column.id] = [];
            break;
          case 'checkbox':
            newItemData[column.id] = false;
            break;
          case 'dropdown':
            newItemData[column.id] = column.options?.choices?.[0]?.value || null;
            break;
          case 'priority':
             newItemData[column.id] = column.options?.choices?.[0]?.value || null;
            break;
          default:
            newItemData[column.id] = null;
        }
      });
    }
    
    try {
      const newItem = await Item.create({
        board_id: boardId,
        title: title,
        order_index: maxOrder + 1,
        data: newItemData
      });
      setItems(prev => [...prev, newItem].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
      setShowNewTaskModal(false); // Close modal after adding
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await Item.update(itemId, updates);
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
      if (showAnalytics || showIntegrations || showAutomations || showAIChat) {
        loadBoardAndItems();
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await Item.delete(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (showAnalytics || showIntegrations || showAutomations || showAIChat) {
        loadBoardAndItems();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      // Don't throw the error, just log it to prevent cascading failures
    }
  };

  // Add rate-limited bulk delete function
  const handleBulkDeleteItems = async (itemIds) => {
    const BATCH_SIZE = 5; // Process 5 items at a time
    const DELAY_MS = 1000; // 1 second delay between batches
    
    for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
      const batch = itemIds.slice(i, i + BATCH_SIZE);
      
      try {
        await Promise.all(batch.map(async (itemId) => {
          try {
            await Item.delete(itemId);
          } catch (error) {
            console.error(`Failed to delete item ${itemId}:`, error);
          }
        }));
        
        // Remove deleted items from state
        setItems(prev => prev.filter(item => !batch.includes(item.id)));
        
        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < itemIds.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        console.error("Error in bulk delete batch:", error);
      }
    }
  };

  const handleReorderItems = async (sourceIndex, destinationIndex) => {
    const reorderedList = Array.from(items);
    
    const [reorderedItem] = reorderedList.splice(sourceIndex, 1);
    reorderedList.splice(destinationIndex, 0, reorderedItem);

    // Update order_index for all items in the reordered list
    const updates = reorderedList.map((item, index) => ({
      ...item,
      order_index: index
    }));

    setItems(updates);

    try {
      await Promise.all(updates.map(item => 
        Item.update(item.id, { order_index: item.order_index })
      ));
    } catch (error) {
      console.error("Error reordering items:", error);
      loadBoardAndItems(); // Reload to resync if an error occurs
    }
  };

  const handleAddColumn = async (columnData) => {
    if (!board) return;
    const newColumn = { ...columnData, id: generateId(), width: columnData.width || 150 };
    const updatedColumns = [...(board.columns || []), newColumn];
    
    try {
      await Board.update(board.id, { 
        columns: updatedColumns,
      });
      setBoard(prev => ({ 
        ...prev, 
        columns: updatedColumns,
      }));
      setShowNewColumnModal(false);
    } catch (error) {
      console.error("Error adding column:", error);
    }
  };

  const handleUpdateColumn = async (columnId, updatedData) => {
    if (!board) return;
    const updatedColumns = board.columns.map(col => 
      col.id === columnId ? { ...col, ...updatedData } : col
    );
    try {
      await Board.update(board.id, { columns: updatedColumns });
      setBoard(prev => ({ ...prev, columns: updatedColumns }));
    } catch (error) {
      console.error("Error updating column:", error);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!board) return;
    const updatedColumns = board.columns.filter(col => col.id !== columnId);
    const updatedItems = items.map(item => {
      const newData = { ...item.data };
      delete newData[columnId];
      return { ...item, data: newData };
    });

    try {
      await Board.update(board.id, { columns: updatedColumns });
      setBoard(prev => ({ ...prev, columns: updatedColumns }));
      setItems(updatedItems);
    } catch (error) {
      console.error("Error deleting column:", error);
    }
  };
  
  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.status.length > 0 && !filters.status.includes(item.data?.status)) {
      return false;
    }
    if (filters.people.length > 0 && !filters.people.includes(item.data?.owner)) {
      return false;
    }
    if (filters.priority.length > 0 && !filters.priority.includes(item.data?.priority)) {
      return false;
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue = a[sortBy] || a.data?.[sortBy] || '';
    let bValue = b[sortBy] || b.data?.[sortBy] || '';
    
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';
    
    // Custom sorting for specific types if necessary (e.g., numbers)
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Default to string comparison for others
    const compareResult = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? compareResult : -compareResult;
  });

  const visibleColumns = (board?.columns || []).filter(col => !hiddenColumns?.has(col.id));
  
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    handleReorderItems(result.source.index, result.destination.index);
  };

  if (isLoading && !board) {
    return (
      <div className="p-8 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0073EA] mx-auto mb-4"></div>
          <p className="text-lg text-[#323338]">Loading board...</p>
        </div>
      </div>
    );
  }
  
  if (!board) {
    return (
      <div className="p-8 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-[#323338] mb-4">Board not found</h2>
            <p className="text-[#676879] mb-6">The board you're looking for doesn't exist or may have been deleted.</p>
            <Link to={createPageUrl("Boards")}>
              <Button className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Boards
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentSelectedCount = selectedItems?.size || 0;
  const numHiddenColumns = hiddenColumns?.size || 0;

  return (
    <div className="bg-[#F5F6F8] min-h-screen">
      <div className="max-w-full">
        <div className="sticky top-0 z-20 bg-[#F5F6F8] pb-4">
          <BoardHeader 
            board={board}
            items={items}
            itemsCount={items.length}
            selectedCount={currentSelectedCount}
            currentView={currentView}
            onViewChange={handleViewChange}
            onShowAnalytics={() => setShowAnalytics(true)}
            onShowIntegrations={() => setShowIntegrations(true)}
            onShowAutomations={() => setShowAutomations(true)}
            onShowAIChat={() => setShowAIChat(true)}
            onUpdateTitle={handleUpdateBoardTitle}
          />
        </div>

        <div className="px-6 py-6">
          {currentView === 'table' && (
            <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-4 shadow-sm border border-[#E1E5F3]">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => setShowNewTaskModal(true)}
                  className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-lg h-10 px-4 font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Task
                </Button>
                
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#676879]" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-[#F5F6F8] border-none rounded-lg h-10 focus:bg-white focus:ring-2 focus:ring-[#0073EA]/20"
                  />
                </div>
                
                <div className="relative">
                  <Button 
                    variant="outline" 
                    className="rounded-lg h-10 px-4 border-[#E1E5F3]"
                    onClick={() => setShowPersonFilter(!showPersonFilter)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Person
                    {filters.people.length > 0 && (
                      <Badge className="ml-2 bg-[#0073EA] text-white rounded-full w-5 h-5 text-xs p-0 flex items-center justify-center">
                        {filters.people.length}
                      </Badge>
                    )}
                  </Button>
                  {showPersonFilter && (
                    <PersonFilter
                      items={items}
                      selectedPeople={filters.people}
                      onChange={(people) => setFilters(prev => ({ ...prev, people }))}
                      onClose={() => setShowPersonFilter(false)}
                    />
                  )}
                </div>
                
                <div className="relative">
                  <Button 
                    variant="outline" 
                    className="rounded-lg h-10 px-4 border-[#E1E5F3]"
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    {(filters.status.length + (filters.priority?.length || 0)) > 0 && (
                      <Badge className="ml-2 bg-[#0073EA] text-white rounded-full w-5 h-5 text-xs p-0 flex items-center justify-center">
                        {filters.status.length + (filters.priority?.length || 0)}
                      </Badge>
                    )}
                  </Button>
                  {showFilterPanel && (
                    <FilterPanel
                      filters={filters}
                      onChange={setFilters}
                      onClose={() => setShowFilterPanel(false)}
                      board={board}
                    />
                  )}
                </div>
                
                <div className="relative">
                  <Button 
                    variant="outline" 
                    className="rounded-lg h-10 px-4 border-[#E1E5F3]"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                  >
                    <SortAsc className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                  {showSortMenu && (
                    <SortMenu
                      sortBy={sortBy}
                      sortDirection={sortDirection}
                      columns={board.columns}
                      onChange={(field, direction) => {
                        setSortBy(field);
                        setSortDirection(direction);
                      }}
                      onClose={() => setShowSortMenu(false)}
                    />
                  )}
                </div>
                
                <div className="relative">
                  <Button 
                    variant="outline" 
                    className="rounded-lg h-10 px-4 border-[#E1E5F3]"
                    onClick={() => setShowHideMenu(!showHideMenu)}
                  >
                    {numHiddenColumns > 0 ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    Hide
                    {numHiddenColumns > 0 && (
                      <Badge className="ml-2 bg-[#0073EA] text-white rounded-full w-5 h-5 text-xs p-0 flex items-center justify-center">
                        {numHiddenColumns}
                      </Badge>
                    )}
                  </Button>
                  {showHideMenu && (
                    <HideMenu
                      columns={board.columns}
                      hiddenColumns={hiddenColumns}
                      onChange={setHiddenColumns}
                      onClose={() => setShowHideMenu(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E1E5F3] overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F6F8] border-b border-[#E1E5F3]">
                    <th className="p-2 w-6 sticky left-0 bg-[#F5F6F8] z-10"></th> {/* Selection Checkbox */}
                    <th className="p-2 w-8 sticky left-6 bg-[#F5F6F8] z-10"></th> {/* Drag Handle */}
                    {visibleColumns.map((column, index) => (
                      <ColumnHeader
                        key={column.id}
                        column={column}
                        onUpdateColumn={handleUpdateColumn}
                        onDeleteColumn={handleDeleteColumn}
                        isFirstDataColumn={index === 0}
                      />
                    ))}
                    <th className="p-2 w-12 text-center sticky right-0 bg-[#F5F6F8] z-10">
                        <button onClick={() => setShowNewColumnModal(true)} className="hover:bg-gray-200 p-1 rounded-md">
                            <Plus className="w-4 h-4 text-[#0073EA]" />
                        </button>
                    </th>
                  </tr>
                </thead>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="board-droppable">
                    {(provided) => (
                      <tbody {...provided.droppableProps} ref={provided.innerRef}>
                        {sortedItems.map((item, index) => (
                           <Draggable key={item.id} draggableId={item.id} index={index}>
                           {(providedDraggable) => (
                              <ItemRow
                                ref={providedDraggable.innerRef}
                                {...providedDraggable.draggableProps}
                                {...providedDraggable.dragHandleProps}
                                item={item}
                                columns={visibleColumns}
                                onUpdate={handleUpdateItem}
                                onDelete={handleDeleteItem}
                                index={index} // Used for order_index updates
                                selectedItems={selectedItems}
                                onSelectItem={(itemId, selected) => {
                                  const newSelected = new Set(selectedItems || []);
                                  if (selected) {
                                    newSelected.add(itemId);
                                  } else {
                                    newSelected.delete(itemId);
                                  }
                                  setSelectedItems(newSelected);
                                }}
                              />
                           )}
                           </Draggable>
                        ))}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </DragDropContext>
              </table>
              {items.length === 0 && !isLoading && (
                <div className="p-8 text-center text-[#676879]">
                  <h3 className="text-xl font-medium mb-2">This board is empty</h3>
                  <p className="mb-4">Start by adding your first task to get things moving.</p>
                  <Button
                    className="bg-[#0073EA] hover:bg-[#0056B3] text-white rounded-lg h-10 px-4 font-medium"
                    onClick={() => setShowNewTaskModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Task
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentView === 'kanban' && (
            <KanbanView
              board={board}
              items={sortedItems}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onReorderItems={handleReorderItems}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              board={board}
              items={sortedItems}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {currentView === 'timeline' && (
            <TimelineView
              board={board}
              items={sortedItems}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>

        <NewTaskModal
          isOpen={showNewTaskModal}
          onClose={() => setShowNewTaskModal(false)}
          board={board}
          onSubmit={handleAddItem}
        />
        <NewColumnModal
          isOpen={showNewColumnModal}
          onClose={() => setShowNewColumnModal(false)}
          onSubmit={handleAddColumn}
        />

        {showAnalytics && (
          <AnalyticsPanel 
            board={board} 
            items={items}
            onClose={() => setShowAnalytics(false)} 
          />
        )}

        {showIntegrations && (
          <IntegrationsPanel board={board} onClose={() => setShowIntegrations(false)} />
        )}

        {showAutomations && (
          <AutomationsPanel 
            board={board} 
            onClose={() => setShowAutomations(false)} 
          />
        )}

        {showAIChat && (
          <AIChat
            board={board}
            items={items}
            isOpen={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </div>
    </div>
  );
}
