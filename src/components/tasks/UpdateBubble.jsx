import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Paperclip, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function UpdateBubble({ update }) {
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name[0];
  };

  const getFileName = (url) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      return decodedUrl.split('/').pop().split('?')[0];
    } catch (e) {
      return 'Attached File';
    }
  };

  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-xs font-bold text-gray-600">{getInitials(update.user_name)}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-800">{update.user_name}</span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(update.created_date), { addSuffix: true })}
          </span>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 mt-1">
          <ReactMarkdown>{update.content}</ReactMarkdown>
        </div>
        {update.file_urls && update.file_urls.length > 0 && (
          <div className="mt-3 space-y-2">
            {update.file_urls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm text-gray-700"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="truncate">{getFileName(url)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}