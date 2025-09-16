import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  MessageSquare,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle,
  Clock,
  Users,
  Settings,
  BarChart3,
  Video,
  FileText,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const faqData = [
  {
    category: 'Getting Started',
    icon: BookOpen,
    questions: [
      {
        question: 'How do I create my first client?',
        answer: 'Navigate to the Clients page and click "New Client". Fill in the client details including name, contact person, and email. The system will automatically create a board for managing their tasks.'
      },
      {
        question: 'How do I invite team members?',
        answer: 'Go to Settings > Team Management and click "Invite User". Enter their email address and select their role (Admin, User, Contractor, or ANGE). They\'ll receive an invitation email to join your workspace.'
      },
      {
        question: 'How do I set up my profile?',
        answer: 'Click on your profile picture in the top right corner and select "Your Profile". You can update your name, timezone, and profile picture here.'
      }
    ]
  },
  {
    category: 'Time Tracking',
    icon: Clock,
    questions: [
      {
        question: 'How do I start tracking time?',
        answer: 'Use the time tracker on your Dashboard or go to Time Tracking page. Select a client, choose a work category, and click "Start Timer". You can also start timers directly from tasks in the Dashboard.'
      },
      {
        question: 'Can I edit time entries after stopping the timer?',
        answer: 'Yes, go to the Time Tracking page and find your entry in the time entries list. Click the edit button to modify the duration, description, or other details.'
      },
      {
        question: 'How do I track time for specific tasks?',
        answer: 'From your Dashboard, find the task in "My Assigned Tasks" and click the play button. This will start a timer specifically linked to that task.'
      }
    ]
  },
  {
    category: 'Client Management',
    icon: Users,
    questions: [
      {
        question: 'How do I add work categories for a client?',
        answer: 'Go to the client\'s detail page and scroll to the Work Categories section. Click "Add Category" to create custom categories like "Customer Support", "Development", etc.'
      },
      {
        question: 'What\'s the difference between snoozing and archiving clients?',
        answer: 'Snoozing temporarily hides a client from your active list - useful for clients on pause. Archiving is for completed or terminated projects. Both can be restored to active status.'
      },
      {
        question: 'How do I set up retainer agreements?',
        answer: 'This feature is available for admins only. Go to the client detail page and scroll to the Retainer Management section to set monthly hours and rates.'
      }
    ]
  },
  {
    category: 'Tasks & Projects',
    icon: CheckCircle,
    questions: [
      {
        question: 'How do I create a new task?',
        answer: 'Go to Client Tasks page or a specific client\'s board. Click "Add New Task", fill in the title and details, assign it to team members, and set due dates and priorities.'
      },
      {
        question: 'How do I set up recurring tasks?',
        answer: 'When creating or editing a task, look for the "Recurrence" setting. Choose from Daily, Weekly, or Monthly. When you complete the task, a new one will automatically be created for the next period.'
      },
      {
        question: 'Can I assign tasks to multiple people?',
        answer: 'Yes, when editing a task, you can select multiple team members in the assignee field. All assigned members will see the task in their dashboard.'
      }
    ]
  },
  {
    category: 'AI Assistant',
    icon: Zap,
    questions: [
      {
        question: 'How do I use the AI chat feature?',
        answer: 'The AI Assistant appears on your Dashboard. Select a client to provide context, then ask questions about projects, request help with tasks, or get coding assistance. You can also upload files for AI analysis.'
      },
      {
        question: 'What kind of questions can I ask the AI?',
        answer: 'You can ask about project status, get help writing emails to clients, request code assistance, ask for task suggestions, or get help with project management strategies.'
      },
      {
        question: 'How do I train the AI with client-specific information?',
        answer: 'Go to the client detail page and scroll to the AI Training section. Upload documents like style guides, FAQs, or company policies to help the AI provide more accurate, client-specific responses.'
      }
    ]
  },
  {
    category: 'Analytics & Reporting',
    icon: BarChart3,
    questions: [
      {
        question: 'How do I view my time reports?',
        answer: 'Go to Analytics page to see comprehensive reports of your time tracking, client work, and productivity metrics. You can filter by date ranges and clients.'
      },
      {
        question: 'How do I generate monthly client reports?',
        answer: 'On the Analytics page, click "Generate Monthly Reports" to create automated reports for all clients with retainer agreements. These show hours used vs. allocated.'
      },
      {
        question: 'Can I export my time data?',
        answer: 'Yes, most reports have export buttons that allow you to download data as CSV or PDF files for external use or client billing.'
      }
    ]
  }
];

const quickLinks = [
  { title: 'Create Your First Client', icon: Users, description: 'Set up your first client project' },
  { title: 'Start Time Tracking', icon: Clock, description: 'Begin tracking your work hours' },
  { title: 'Invite Team Members', icon: Users, description: 'Add colleagues to your workspace' },
  { title: 'AI Assistant Guide', icon: Zap, description: 'Learn to use AI for productivity' }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const filteredFaqData = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-[#323338]">Help & Support</h1>
          </motion.div>
          <p className="text-lg text-[#676879] max-w-2xl mx-auto">
            Get the most out of HarkFlow with our comprehensive guides, tutorials, and support resources.
          </p>
        </div>

        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="guides" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Guides
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-6">
            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickLinks.map((link, index) => (
                    <motion.div
                      key={link.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <link.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-sm text-gray-900">{link.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600">{link.description}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search help topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* FAQ Sections */}
            <div className="space-y-4">
              {filteredFaqData.map((category, categoryIndex) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <category.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        {category.category}
                        <Badge variant="outline">{category.questions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {category.questions.map((qa, index) => (
                        <Collapsible
                          key={index}
                          open={openSections[`${categoryIndex}-${index}`]}
                          onOpenChange={() => toggleSection(`${categoryIndex}-${index}`)}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                            <span className="font-medium text-gray-900">{qa.question}</span>
                            {openSections[`${categoryIndex}-${index}`] ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-3 pb-3">
                            <div className="pt-3 text-gray-700 leading-relaxed border-t border-gray-200 mt-2">
                              {qa.answer}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tutorials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Tutorials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Video Tutorials Coming Soon</h3>
                  <p>We're working on creating helpful video tutorials to get you started faster.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guides" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Guides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Detailed Guides Coming Soon</h3>
                  <p>Comprehensive step-by-step guides are being prepared for you.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Get personalized help from our support team. We typically respond within 24 hours.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Chat with our support team in real-time during business hours (9 AM - 5 PM AEST).
                  </p>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Chat
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Feature Requests & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Have an idea for improving HarkFlow? We'd love to hear from you! Your feedback helps us build better features.
                </p>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}