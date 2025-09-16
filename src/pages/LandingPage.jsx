
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Briefcase, Clock, MessageSquare, CheckCircle2, TrendingUp, Slack, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Briefcase className="w-8 h-8 text-blue-500" />,
    title: 'Unified Client Management',
    description: 'Consolidate all client tasks, projects, and communication into a single, organized view. Never lose track of a deliverable again.',
  },
  {
    icon: <Clock className="w-8 h-8 text-green-500" />,
    title: 'Effortless Time Tracking',
    description: 'Track time against specific tasks and clients with a single click. Generate insightful reports for accurate billing and resource planning.',
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-purple-500" />,
    title: 'AI-Powered Assistant',
    description: 'Leverage our built-in AI to draft emails, summarize tasks, and quickly find information, freeing you up for more strategic work.',
  },
  {
    icon: <Slack className="w-8 h-8 text-pink-500" />,
    title: 'Seamless Slack Integration',
    description: 'Turn client conversations into actionable tasks directly from Slack. Keep your communication and workflow perfectly in sync.',
  },
];

const Stat = ({ value, label }) => (
  <div className="text-center">
    <p className="text-4xl font-bold text-blue-600">{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

export default function LandingPage() {
  const handleLogin = () => {
    // This will redirect to the Google login page provided by the platform
    window.location.href = '/login';
  };

  return (
    <div className="bg-white text-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#323338] text-xl">HarkFlow</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to={createPageUrl("Contact")} className="text-sm font-medium text-gray-600 hover:text-blue-600">
              Contact
            </Link>
            <Button onClick={handleLogin} size="sm">
              Login
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-4 border-blue-200 bg-blue-50 text-blue-700">
            The All-In-One Client Operations Platform
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto">
            Stop juggling tabs. Start delighting clients.
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            HarkFlow brings all your client tasks, time tracking, and communication into one smart, collaborative platform.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to={createPageUrl("Contact")}>
              <Button size="lg" variant="outline">Contact Sales</Button>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything you need. Nothing you don't.</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Focus on what matters most: delivering exceptional work for your clients. We handle the rest.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xl font-medium text-gray-700 max-w-3xl mx-auto">
            "HarkFlow has revolutionized how we manage client projects. It's the first tool that actually simplifies our workflow instead of adding complexity."
          </p>
          <p className="mt-4 font-semibold">Alex Johnson</p>
          <p className="text-sm text-gray-500">CEO, Creative Solutions</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl">HarkFlow</span>
          </div>
          <p className="text-gray-400 mb-4">
            Streamline your client operations with intelligent task management.
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <Link to={createPageUrl("Contact")} className="hover:text-white">
              Contact
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-xs text-gray-500">
            <p>&copy; 2024 HarkFlow. All rights reserved.</p>
            <p className="mt-2">Contact: <a href="mailto:andy@harkco.com.au" className="text-blue-400 hover:text-blue-300">andy@harkco.com.au</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
