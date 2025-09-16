
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PromptUsage } from "@/api/entities";
import {
  Mail,
  FileText,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Master list of all available prompt templates
const ALL_TEMPLATES = [
  { id: 'email', title: 'Write an Email', icon: Mail, type: 'interactive', basePrompt: 'Help me write a professional email about:', question: 'What is the topic of the email?' },
  { id: 'social_caption', title: 'Create Social Caption', icon: MessageSquare, type: 'interactive', basePrompt: 'Write an engaging social media caption for this client about:', question: 'What is the social media post about?' },
  { id: 'brainstorm', title: 'Brainstorm Ideas', icon: Lightbulb, type: 'interactive', basePrompt: 'Brainstorm some creative ideas for this client based on the following topic:', question: 'What should we brainstorm ideas for?' },
  { id: 'summarize', title: 'Summarize Documents', icon: FileText, type: 'static', prompt: 'Please summarize the attached documents and provide the key takeaways.' },
];

export default function DynamicPrompts({ clientId, onPromptClick }) {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndSetPrompts = async () => {
      setIsLoading(true);
      try {
        if (!clientId) {
          setPrompts(ALL_TEMPLATES.slice(0, 4));
          return;
        }

        const frequentPromptsData = await PromptUsage.filter(
          { client_id: clientId },
          '-usage_count',
          4
        );
        
        const frequentPrompts = frequentPromptsData
          .map(usage => ALL_TEMPLATES.find(t => t.id === usage.template_id))
          .filter(Boolean);

        const combined = [...frequentPrompts, ...ALL_TEMPLATES];
        const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
        
        setPrompts(unique.slice(0, 4));
      } catch (error) {
        console.error("Error fetching dynamic prompts, using defaults:", error);
        setPrompts(ALL_TEMPLATES.slice(0, 4));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSetPrompts();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {prompts.map((prompt) => (
        <Button
          key={prompt.id}
          variant="outline"
          size="sm"
          onClick={() => onPromptClick(prompt)}
          className="text-xs h-8 justify-start text-left"
        >
          <prompt.icon className="w-3 h-3 mr-2 flex-shrink-0" />
          <span className="truncate">{prompt.title}</span>
        </Button>
      ))}
    </div>
  );
}
