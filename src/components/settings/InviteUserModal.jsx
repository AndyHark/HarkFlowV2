import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, UserPlus, Info, Copy, Check } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function InviteUserModal({ isOpen, onClose, currentUser }) {
  const [copied, setCopied] = useState(false);

  const signupLink = useMemo(() => {
    if (!currentUser?.company_name) {
      return '';
    }
    const baseUrl = 'https://harkflow.com'; // Use your custom domain
    const contactPageUrl = createPageUrl('Contact'); // Points to the new multi-purpose contact/join page
    const companyParam = encodeURIComponent(currentUser.company_name);
    return `${baseUrl}${contactPageUrl}?companyName=${companyParam}`;
  }, [currentUser]);

  const handleCopyToClipboard = () => {
    if (!signupLink) return;
    navigator.clipboard.writeText(signupLink);
    setCopied(true);
    toast.success("Signup link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Team Member
          </DialogTitle>
          <DialogDescription>
            Share this link with new team members to guide them through joining your company.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="signup-link">Team Invitation Link</Label>
            <div className="flex items-center gap-2">
              <Input
                id="signup-link"
                value={signupLink}
                readOnly
                className="bg-gray-100"
              />
              <Button size="icon" onClick={handleCopyToClipboard}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Copy the invitation link above.</li>
                <li>Send it to your new team member.</li>
                <li>They'll be prompted to sign up or log in.</li>
                <li>After signing up, they will confirm their company and be added to your team.</li>
              </ol>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}