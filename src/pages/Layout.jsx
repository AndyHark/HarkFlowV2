

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { TimeEntry } from "@/api/entities"; // Added import for TimeEntry
import {
  LayoutGrid,
  Plus,
  Search,
  Bell,
  Settings,
  HelpCircle,
  Users,
  BarChart3,
  Menu as MenuIcon,
  Briefcase,
  X,
  TrendingUp,
  Building2,
  Clock, // Added Clock icon for Time Tracking
  CheckCircle2 // Added CheckCircle2 for Client Tasks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const allNavItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutGrid,
  },
  {
    title: "Client Tasks",
    url: createPageUrl("ClientTasks"),
    icon: CheckCircle2,
  },
  {
    title: "Clients",
    url: createPageUrl("Clients"),
    icon: Building2,
  },
  {
    title: "Time Tracking",
    url: createPageUrl("TimeTracking"),
    icon: Clock,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: TrendingUp,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

const userNavItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutGrid,
  },
  {
    title: "Client Tasks",
    url: createPageUrl("ClientTasks"),
    icon: CheckCircle2,
  },
  {
    title: "Time Tracking",
    url: createPageUrl("TimeTracking"),
    icon: Clock,
  },
];

const userNavigation = [
    { name: 'Your Profile', href: createPageUrl("Profile") },
    { name: 'Settings', href: createPageUrl("Settings") }, // Changed to Settings route
    { name: 'Sign out', href: '#' },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [navigationItems, setNavigationItems] = useState(userNavItems);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimer, setCurrentTimer] = useState(null); // Added state for current timer

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        // This check is now handled in the main render logic
        // for better control over what is displayed.

        // Implement role-based views for navigation
        if (currentUser) {
            const userRole = currentUser.custom_role || currentUser.role;
            if (currentUser.role === 'admin' || userRole === 'admin' || userRole === 'ANGE') {
              setNavigationItems(allNavItems);
            } else {
              setNavigationItems(userNavItems);
            }
        }
      } catch (error) {
        console.log("User not logged in or error fetching user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Check for running timer and update document title
  useEffect(() => {
    const checkRunningTimer = async () => {
      if (!user) {
        setCurrentTimer(null); // Clear timer if user logs out
        return;
      }
      
      try {
        const runningTimers = await TimeEntry.filter({ 
          user_email: user.email, 
          is_running: true 
        }, '-start_time', 1); // Order by start_time descending, limit to 1
        
        const timer = runningTimers.length > 0 ? runningTimers[0] : null;
        setCurrentTimer(timer);
      } catch (error) {
        console.error('Error checking for running timer:', error);
        setCurrentTimer(null);
      }
    };

    if (user) {
      checkRunningTimer(); // Initial check
      // Check every 30 seconds for timer updates
      const interval = setInterval(checkRunningTimer, 30000);
      return () => clearInterval(interval); // Cleanup interval on component unmount or user change
    } else {
      setCurrentTimer(null); // Ensure timer is null if no user
    }
  }, [user]); // Re-run when user changes

  // Update document title based on timer status
  useEffect(() => {
    const baseTitle = 'HarkFlow';
    
    if (currentTimer) {
      const description = currentTimer.description || 'Working';
      document.title = `⏱️ ${description} - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [currentTimer]); // Re-run when currentTimer changes

  const publicPages = ['LandingPage', 'Contact', 'Register'];
  const isPublicPage = publicPages.includes(currentPageName);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // LOGIC REFINEMENT:
  // 1. If a user is logged in but has NO company_name, they are "unregistered".
  //    - If they are already on the Contact page, show it.
  //    - If they try to go anywhere else, redirect them to the Contact page.
  if (user && !user.company_name) {
    if (currentPageName !== 'Contact') {
      // Use window.location.href for a full redirect to enforce the "jail"
      window.location.href = createPageUrl('Contact');
      // Show loader while redirecting
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    // If they are on the Contact page, render it.
    return <div className="bg-white">{children}</div>;
  }
  
  // 2. If user is NOT logged in, only show public pages.
  if (!user) {
    if (isPublicPage) {
        return <div className="bg-white">{children}</div>;
    }
    // If not logged in and trying to access a private page, redirect to landing.
    window.location.href = createPageUrl('LandingPage');
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }
  
  // 3. If user IS logged in AND has a company_name, show the full app layout.
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F8]">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-[#E1E5F3] shadow-sm sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section: Logo and Main Nav */}
            <div className="flex items-center">
              {/* Logo */}
              <Link to={createPageUrl("Dashboard")} className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-[#323338] text-xl">HarkFlow</span>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden md:ml-10 md:flex md:items-baseline md:space-x-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.url
                        ? 'bg-[#E1E5F3] text-[#0073EA]'
                        : 'text-[#323338] hover:bg-[#F5F6F8] hover:text-[#0073EA]'
                    }`}
                    aria-current={location.pathname === item.url ? 'page' : undefined}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Center Section: Search (Desktop) */}
            <div className="hidden md:flex flex-1 justify-center px-2 lg:ml-6 lg:justify-end">
              <div className="max-w-lg w-full lg:max-w-xs">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <Input
                    id="search"
                    name="search"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0073EA] focus:border-[#0073EA] sm:text-sm"
                    placeholder="Search clients, tasks..."
                    type="search"
                  />
                </div>
              </div>
            </div>

            {/* Right Section: Icons and User Menu */}
            <div className="hidden md:ml-4 md:flex md:items-center md:space-x-2">
              <Button variant="ghost" size="icon" className="hover:bg-[#E1E5F3] rounded-lg h-10 w-10">
                <Bell className="w-5 h-5 text-[#676879]" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-[#E1E5F3] rounded-lg h-10 w-10"
                onClick={() => window.location.href = createPageUrl('Help')}
              >
                <HelpCircle className="w-5 h-5 text-[#676879]" />
              </Button>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full h-10 w-10 p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
                       <AvatarFallback>{user?.full_name ? user.full_name[0].toUpperCase() : 'U'}</AvatarFallback>
                     </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" align="end">
                  <DropdownMenuLabel>{user?.full_name || 'My Account'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")}>Your Profile</Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Settings")}>Admin Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => User.logout()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="hover:bg-[#E1E5F3] rounded-lg h-10 w-10"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E1E5F3]">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === item.url
                      ? 'bg-[#E1E5F3] text-[#0073EA]'
                      : 'text-[#323338] hover:bg-[#F5F6F8] hover:text-[#0073EA]'
                  }`}
                  aria-current={location.pathname === item.url ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
            </div>
            {/* Mobile Search */}
            <div className="pt-4 pb-3 border-t border-gray-200">
               <div className="px-2">
                <label htmlFor="search-mobile" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <Input
                    id="search-mobile"
                    name="search-mobile"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0073EA] focus:border-[#0073EA] sm:text-sm"
                    placeholder="Search clients, tasks..."
                    type="search"
                  />
                </div>
              </div>
            </div>
            {/* Mobile User Menu */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
                    <AvatarFallback>{user?.full_name ? user.full_name[0].toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.full_name || 'User Name'}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email || 'user@example.com'}</div>
                </div>
                <Button variant="ghost" size="icon" className="ml-auto hover:bg-[#E1E5F3] rounded-lg h-10 w-10">
                  <Bell className="w-5 h-5 text-[#676879]" />
                </Button>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  to={createPageUrl("Profile")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Your Profile
                </Link>
                <Link
                  to={createPageUrl("Settings")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Admin Settings
                </Link>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    User.logout();
                  }}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Sign out
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-auto">
        {children}
      </main>
    </div>
  );
}

