
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User as UserEntity } from '@/api/entities';
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Mail, User as UserIcon, Clock } from 'lucide-react'; // Bug icon removed

// Common timezones list
const COMMON_TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' }
];

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('Australia/Sydney'); // New state for timezone
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);

  // Debug state variables removed
  // const [debugInfo, setDebugInfo] = useState(null);
  // const [isDebugging, setIsDebugging] = useState(false);

  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await UserEntity.me();
      setUser(currentUser);
      setFullName(currentUser.full_name || '');
      setTimezone(currentUser.timezone || 'Australia/Sydney'); // Load timezone from user data
      setAvatarPreview(currentUser.avatar_url || null);
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load your profile data.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {};
      let avatarUpdated = false;

      if (newAvatarFile) {
        const { file_url } = await UploadFile({ file: newAvatarFile });
        if (file_url) {
          updateData.avatar_url = file_url;
          avatarUpdated = true;
        }
      }

      if (fullName.trim() !== user.full_name) {
        updateData.full_name = fullName.trim();
      }

      // Check and include timezone in updateData
      if (timezone !== user.timezone) {
        updateData.timezone = timezone;
      }

      if (Object.keys(updateData).length > 0) {
        await UserEntity.updateMyUserData(updateData);
        toast.success("Profile updated successfully!");
        if (avatarUpdated) {
          // A full reload ensures the layout's avatar is also updated.
          window.location.reload(); 
        }
      } else {
        toast.info("No changes to save.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    }
    setIsSaving(false);
  };

  // handleDebugAccess function removed
  // const handleDebugAccess = useCallback(async () => {
  //   setIsDebugging(true);
  //   try {
  //     const { debugUserAccess } = await import('@/api/functions');
  //     const response = await debugUserAccess();
      
  //     if (response.data) {
  //       setDebugInfo(response.data);
  //     }
  //   } catch (error) {
  //     console.error('Debug failed:', error);
  //     toast.error(`Debug failed: ${error.message}`);
  //   } finally {
  //     setIsDebugging(false);
  //   }
  // }, []);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 bg-[#F5F6F8] min-h-screen flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#323338]">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                  <AvatarImage src={avatarPreview} alt={fullName} />
                  <AvatarFallback className="text-3xl bg-gray-200">{getInitials(fullName)}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-blue-600 hover:bg-blue-700"
                  onClick={() => avatarInputRef.current.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <Input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-semibold text-[#323338]">{fullName}</h2>
                <p className="text-sm text-[#676879]">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2 text-gray-700">
                  <UserIcon className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="rounded-lg h-11 bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="rounded-lg h-11">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  This helps with accurate date calculations for recurring tasks
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 p-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#0073EA] hover:bg-[#0056B3] text-white px-6"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

        {/* Debug Section removed */}
        {/*
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#323338]">
              <Bug className="w-5 h-5" />
              Debug Data Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Debug User Access</h4>
              <p className="text-sm text-blue-700 mb-4">
                This will show detailed information about data visibility for troubleshooting.
              </p>
              <Button 
                onClick={handleDebugAccess}
                disabled={isDebugging}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isDebugging ? 'Debugging...' : 'Run Debug Check'}
              </Button>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Fix Board Data</h4>
              <p className="text-sm text-orange-700 mb-4">
                If boards show as undefined company names, run this to fix them.
              </p>
              <Button 
                onClick={async () => {
                  try {
                    const { fixBoardCompanyNames } = await import('@/api/functions');
                    const response = await fixBoardCompanyNames();
                    if (response.data) {
                      toast.success(`Fixed ${response.data.updated} boards!`);
                      // Re-run debug after fixing
                      setTimeout(handleDebugAccess, 1000);
                    }
                  } catch (error) {
                    toast.error(`Fix failed: ${error.message}`);
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Fix Board Company Names
              </Button>
            </div>

            {debugInfo && (
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Debug Results:</h4>
                <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
}
