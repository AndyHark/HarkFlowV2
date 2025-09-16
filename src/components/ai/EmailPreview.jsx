import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Mail } from "lucide-react";

export default function EmailPreview({ emailData }) {
  const [copied, setCopied] = useState(false);

  const fullEmailText = `Subject: ${emailData.subject}\n\n${emailData.greeting},\n\n${emailData.body}\n\n${emailData.sign_off}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg text-left">
      <div className="p-4 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-600" />
          <h4 className="font-semibold text-gray-800 text-sm">Generated Email Draft</h4>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy email text">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
        </Button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Subject</p>
          <p className="font-medium text-gray-900">{emailData.subject}</p>
        </div>
        <Separator />
        <div className="space-y-4 whitespace-pre-wrap text-sm leading-relaxed">
          <p>{emailData.greeting},</p>
          <p>{emailData.body}</p>
          <p>{emailData.sign_off}</p>
        </div>
      </div>
    </div>
  );
}