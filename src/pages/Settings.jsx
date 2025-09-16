
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Users,
  Shield,
  UserPlus,
  Mail,
  Crown,
  User,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Star,
  DollarSign, // Added DollarSign icon
  Loader2 // Added Loader2 icon for migration button
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User as UserEntity } from "@/api/entities";
import IntegrationsManager from "../components/settings/IntegrationsManager";
import InviteUserModal from "../components/settings/InviteUserModal"; // Import the new modal
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRates, setUserRates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false); // New state for invite modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_email: '',
    company_website: '',
    default_invoicing_assignee_email: ''
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false); // Add this line
  // Removed debugInfo and isDebugging states

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, allUsers] = await Promise.all([
        UserEntity.me(),
        UserEntity.list('-created_date')
      ]);
      
      setCurrentUser(user);
      setUsers(allUsers);
      
      const rates = {};
      allUsers.forEach(u => {
        rates[u.id] = u.hourly_rate !== null && u.hourly_rate !== undefined ? String(u.hourly_rate) : '';
      });
      setUserRates(rates);

      setCompanySettings({
        company_name: user.company_name || '', // Default empty if not set
        company_email: user.company_email || '', // Default empty if not set
        company_website: user.company_website || '', // Default empty if not set
        default_invoicing_assignee_email: user.default_invoicing_assignee_email || ''
      });
    } catch (error) {
      console.error('Error loading settings data:', error);
      // Fallback for company settings if user.company_name is not available
      setCompanySettings({
        company_name: 'ClientFlow',
        company_email: '',
        company_website: '',
        default_invoicing_assignee_email: ''
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRateChange = (userId, rate) => {
    setUserRates(prev => ({...prev, [userId]: rate}));
  };

  const handleRateSave = async (userId) => {
    const rateString = userRates[userId];
    if (rateString === null || rateString === undefined || rateString.trim() === '') {
      // If the field is empty, set hourly_rate to null
      try {
        await UserEntity.update(userId, { hourly_rate: null });
        setUsers(prevUsers => prevUsers.map(u => 
            u.id === userId ? { ...u, hourly_rate: null } : u
        ));
        setUserRates(prev => ({...prev, [userId]: ''})); // Clear the input field
      } catch (error) {
        console.error('Error clearing hourly rate:', error);
        alert('Failed to clear hourly rate. Please try again.');
        // Revert the rate in the state if save fails
        setUsers(prevUsers => prevUsers.map(u => 
          u.id === userId ? { ...u, hourly_rate: users.find(user => user.id === userId).hourly_rate } : u
        ));
        setUserRates(prev => ({...prev, [userId]: users.find(user => user.id === userId).hourly_rate ? String(users.find(user => user.id === userId).hourly_rate) : ''}));
      }
      return;
    }

    const rate = parseFloat(rateString);
    if (isNaN(rate)) {
      alert("Please enter a valid number for the hourly rate.");
      // Revert the rate in the state if input is invalid
      setUserRates(prev => ({...prev, [userId]: users.find(user => user.id === userId).hourly_rate ? String(users.find(user => user.id === userId).hourly_rate) : ''}));
      return;
    }
    
    if (rate < 0) {
      alert("Hourly rate cannot be negative.");
      // Revert the rate in the state if input is invalid
      setUserRates(prev => ({...prev, [userId]: users.find(user => user.id === userId).hourly_rate ? String(users.find(user => user.id === userId).hourly_rate) : ''}));
      return;
    }


    try {
      await UserEntity.update(userId, { hourly_rate: rate });
      alert("Hourly rate updated successfully!");
      setUsers(prevUsers => prevUsers.map(u => 
          u.id === userId ? { ...u, hourly_rate: rate } : u
      ));
    } catch (error) {
      console.error('Error updating hourly rate:', error);
      alert('Failed to update hourly rate. Please try again.');
      // Revert the rate in the state if save fails
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, hourly_rate: users.find(user => user.id === userId).hourly_rate } : u
      ));
      setUserRates(prev => ({...prev, [userId]: users.find(user => user.id === userId).hourly_rate ? String(users.find(user => user.id === userId).hourly_rate) : ''}));
    }
  };

  const handleSaveCompanySettings = async () => {
    setIsSavingCompany(true);
    try {
      // Assuming UserEntity.updateMyUserData exists and updates the current user's details.
      await UserEntity.updateMyUserData(companySettings);
      alert('Company settings saved successfully!');
      const user = await UserEntity.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error saving company settings:', error);
      alert('Failed to save company settings. Please try again.');
    }
    setIsSavingCompany(false);
  };

  const handleUpdateCustomRole = async (userId, newCustomRole) => {
    // This function now updates BOTH the custom_role for display,
    // and the base 'role' for platform permissions.
    const updatePayload = {
      custom_role: newCustomRole,
      // If the custom role is admin-like, set the base role to admin.
      // Otherwise, set it to user. This satisfies the platform's validation.
      role: (newCustomRole === 'admin' || newCustomRole === 'ANGE') ? 'admin' : 'user'
    };

    try {
      await UserEntity.update(userId, updatePayload);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updatePayload } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await UserEntity.delete(selectedUser.id);
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleMigrateData = async () => {
    setIsMigrating(true);
    try {
      const { migrateItemCompanyNames } = await import('@/api/functions');
      const response = await migrateItemCompanyNames();
      
      if (response.data) {
        alert(`Migration completed! Updated ${response.data.updated} tasks.`);
      } else {
        alert('Migration completed successfully.');
      }
      
      // Reload the page to see updated data
      window.location.reload();
    } catch (error) {
      console.error('Migration failed:', error);
      alert(`Migration failed: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Removed handleDebugAccess function

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'ANGE': return <Star className="w-4 h-4 text-purple-600" />;
      case 'contractor': return <Briefcase className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (user) => {
    const role = user.custom_role || user.role; // Prioritize custom_role
    const styles = {
      admin: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      user: 'bg-gray-100 text-gray-800 border-gray-300',
      contractor: 'bg-blue-100 text-blue-800 border-blue-300',
      ANGE: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    
    return (
      <Badge className={`${styles[role] || styles.user} border`}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    );
  };

  const getStatusBadge = (user) => {
    const isActive = user.last_login_at || user.created_date; // A user is "active" if they've logged in or at least created
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (!currentUser) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0073EA] mx-auto mb-4"></div>
          <p className="text-lg text-[#323338]">Loading...</p>
        </div>
      </div>
    );
  }

  // Adjusted role check to include 'user' as default if currentUser.role is not 'admin'
  // Only admins and ANGE users should see the full settings page.
  const userRole = currentUser.custom_role || currentUser.role;
  if (currentUser.role !== 'admin' && userRole !== 'ANGE') {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#323338] mb-2">Access Restricted</h2>
            <p className="text-[#676879]">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#323338]">Settings</h1>
          <p className="text-[#676879] mt-2">Manage your workspace settings and preferences</p>
        </div>

        {/* Removed Debug Section */}

        {/* Data Migration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Data Migration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Fix Data Access Issues</h4>
              <p className="text-sm text-yellow-700 mb-4">
                If you're not seeing clients or tasks, run this migration to fix data access permissions.
              </p>
              <Button 
                onClick={handleMigrateData}
                disabled={isMigrating}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  'Run Data Migration'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-sm text-gray-900">{currentUser?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{currentUser?.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <p className="text-sm text-gray-900 font-semibold">
                  {currentUser?.company_name || <span className="text-red-600">NOT SET - This is the problem!</span>}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <p className="text-sm text-gray-900">{currentUser?.custom_role || currentUser?.role || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white border border-[#E1E5F3]">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#323338]">{users.length}</p>
                      <p className="text-sm text-[#676879]">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#323338]">
                        {users.filter(u => u.role === 'admin').length}
                      </p>
                      <p className="text-sm text-[#676879]">Admins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#323338]">
                        {users.filter(u => u.last_login_at).length}
                      </p>
                      <p className="text-sm text-[#676879]">Active Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-[#0073EA] hover:bg-[#0056B3] text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    users.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                           <Avatar className="w-12 h-12">
                             <AvatarImage src={user.avatar_url} alt={user.full_name} />
                             <AvatarFallback className="text-lg bg-gray-200">
                               {user.full_name?.[0]?.toUpperCase() || 'U'}
                             </AvatarFallback>
                           </Avatar>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-[#323338]">{user.full_name}</h3>
                              {user.id === currentUser.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-[#676879]">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {currentUser.role === 'admin' && user.id !== currentUser.id && (
                             <div className="flex items-center gap-1">
                               <DollarSign className="w-4 h-4 text-gray-400" />
                               <Input
                                 type="number"
                                 placeholder="Rate/hr"
                                 value={userRates[user.id] || ''}
                                 onChange={(e) => handleRateChange(user.id, e.target.value)}
                                 onBlur={() => handleRateSave(user.id)}
                                 className="h-8 w-24 text-center"
                               />
                             </div>
                          )}

                          {getStatusBadge(user)}
                          {getRoleBadge(user)}
                          
                          <div className="flex items-center gap-1">
                            {user.id !== currentUser.id && (
                              <>
                                <Select
                                  value={user.custom_role || user.role}
                                  onValueChange={(newRole) => handleUpdateCustomRole(user.id, newRole)}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="contractor">Contractor</SelectItem>
                                    <SelectItem value="ANGE">ANGE</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-800"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            {/* Company Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings(prev => ({...prev, company_name: e.target.value}))}
                      placeholder="Your Company Name"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">Company Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={companySettings.company_email}
                      onChange={(e) => setCompanySettings(prev => ({...prev, company_email: e.target.value}))}
                      placeholder="admin@yourcompany.com"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_website">Website</Label>
                    <Input
                      id="company_website"
                      type="url"
                      value={companySettings.company_website}
                      onChange={(e) => setCompanySettings(prev => ({...prev, company_website: e.target.value}))}
                      placeholder="https://yourcompany.com"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_invoicing_assignee">Default Invoicing Assignee *</Label>
                    <Select
                      value={companySettings.default_invoicing_assignee_email}
                      onValueChange={(value) => setCompanySettings(prev => ({ ...prev, default_invoicing_assignee_email: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">This user will be assigned automated invoicing tasks</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveCompanySettings}
                  disabled={isSavingCompany}
                  className="bg-[#0073EA] hover:bg-[#0056B3] text-white"
                >
                  {isSavingCompany ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </CardContent>
            </Card>

            {/* Default Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Default Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_hourly_rate">Default Hourly Rate ($)</Label>
                    <Input
                      id="default_hourly_rate"
                      type="number"
                      defaultValue="75"
                      min="0"
                      step="0.01"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_assignee">Default Task Assignee</Label>
                    <Select defaultValue={users.length > 0 ? users[0].email : ""}>
                      <SelectTrigger className="rounded-xl border-[#E1E5F3] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_hours_start">Business Hours Start</Label>
                    <Input
                      id="business_hours_start"
                      type="time"
                      defaultValue="09:00"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_hours_end">Business Hours End</Label>
                    <Input
                      id="business_hours_end"
                      type="time"
                      defaultValue="17:00"
                      className="rounded-xl border-[#E1E5F3] h-12"
                    />
                  </div>
                </div>

                <Button className="bg-[#0073EA] hover:bg-[#0056B3] text-white">
                  Save Default Settings
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-[#676879]">Send email updates for task changes</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Daily Summary Reports</h4>
                    <p className="text-sm text-[#676879]">Daily email with task and time summaries</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Overdue Task Alerts</h4>
                    <p className="text-sm text-[#676879]">Alert when tasks are overdue</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">New Client Onboarding Reminders</h4>
                    <p className="text-sm text-[#676879]">Automated reminders for client setup tasks</p>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>

                <Button className="bg-[#0073EA] hover:bg-[#0056B3] text-white">
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-[#E1E5F3] rounded-lg">
                    <h4 className="font-medium mb-2">Export Data</h4>
                    <p className="text-sm text-[#676879] mb-3">Download all your data as CSV files</p>
                    <Button variant="outline" className="w-full border-[#E1E5F3]">
                      Export All Data
                    </Button>
                  </div>

                  <div className="p-4 border border-[#E1E5F3] rounded-lg">
                    <h4 className="font-medium mb-2">Backup Settings</h4>
                    <p className="text-sm text-[#676879] mb-3">Automatic weekly backups enabled</p>
                    <Button variant="outline" className="w-full border-[#E1E5F3]">
                      Configure Backups
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-3">These actions cannot be undone</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                      Reset All Data
                    </Button>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                      Delete Organization
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <IntegrationsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* --- MODALS --- */}
        <InviteUserModal 
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            currentUser={currentUser}
        />

        {/* Delete User Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser?.full_name}'s account? 
                This action cannot be undone and they will lose access to the system immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
