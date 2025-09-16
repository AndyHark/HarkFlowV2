
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Users, Building2, CheckCircle, ArrowRight, Mail, Send } from 'lucide-react';
import { User } from '@/api/entities';
import { SendEmail } from '@/api/integrations';
import { toast } from 'sonner';

export default function ContactPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyNameFromUrl, setCompanyNameFromUrl] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  // State for the new contact form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // This logic runs every time the page loads.
    const urlParams = new URLSearchParams(window.location.search);
    const company = urlParams.get('companyName');
    if (company) {
      setCompanyNameFromUrl(decodeURIComponent(company));
    }

    const checkUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        // User is not logged in.
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleJoinCompany = async () => {
    setIsJoining(true);
    try {
      await User.updateMyUserData({ company_name: companyNameFromUrl });
      toast.success(`Welcome to ${companyNameFromUrl}!`);
      // Redirect to the dashboard after successfully joining.
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Failed to join company:', error);
      toast.error('Could not join the company. Please contact your administrator.');
      setIsJoining(false);
    }
  };

  const handleLoginRedirect = () => {
    // Redirect to the platform's built-in login/signup page.
    User.login();
  };
  
  // Handlers for the new contact form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSubmitted(false);

    try {
      await SendEmail({
        to: 'andy@harkco.com.au',
        subject: `HarkFlow Contact Form - ${formData.name}`,
        body: `
          New message from the HarkFlow contact form:

          Name: ${formData.name}
          Email: ${formData.email}
          Company: ${formData.company || 'Not provided'}
          
          Message:
          ${formData.message}
        `.trim()
      });

      setIsSubmitted(true);
      setFormData({ name: '', email: '', company: '', message: '' });
      toast.success("Your message has been sent successfully!");
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast.error('There was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // SCENARIO 1: User is logged in but has no company. This happens right after they create an account.
  if (currentUser && !currentUser.company_name && companyNameFromUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Just one more step!</CardTitle>
            <CardDescription className="pt-2">
              Confirm you are joining the correct company.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="company-name">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="company-name"
                  value={companyNameFromUrl}
                  readOnly
                  className="pl-10 bg-gray-100 text-lg font-medium"
                />
              </div>
            </div>
            <Button
              onClick={handleJoinCompany}
              disabled={isJoining}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isJoining ? 'Joining...' : 'Confirm & Join Company'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // SCENARIO 2: User is NOT logged in, but has arrived via an invitation link.
  if (!currentUser && companyNameFromUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 shadow-lg text-center">
          <CardHeader>
             <div className="flex justify-center items-center gap-2 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">HarkFlow</CardTitle>
            </div>
            <CardDescription className="text-lg pt-2">
              You've been invited to join <strong className="text-blue-600">{companyNameFromUrl}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Please sign up or log in to accept your invitation and access the workspace.
            </p>
            <Button onClick={handleLoginRedirect} size="lg" className="w-full">
              Sign Up or Log In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SCENARIO 3: Default view - Show the contact form
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to={createPageUrl("LandingPage")} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#323338] text-xl">HarkFlow</span>
          </Link>
          <nav>
             <Link to={createPageUrl("LandingPage")}>
               <Button variant="ghost">Back to Home</Button>
             </Link>
          </nav>
        </div>
      </header>
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-xl w-full p-6 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Get in Touch</CardTitle>
            <CardDescription className="pt-2">
              Have questions or want to learn more? Send us a message!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Thank You!</h3>
                <p className="text-gray-600">Your message has been sent. We'll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} placeholder="you@example.com" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="company">Company (optional)</Label>
                  <Input id="company" name="company" value={formData.company} onChange={handleInputChange} placeholder="Your Company Inc." />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" required value={formData.message} onChange={handleInputChange} placeholder="How can we help?" rows={5} />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                  {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
