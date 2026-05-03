import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            />
          ),
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 my-2" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 my-2" />,
          li: ({ node, ...props }) => <li {...props} className="mb-1" />,
          p: ({ node, ...props }) => <p {...props} className="mb-2 leading-relaxed" />,
          strong: ({ node, ...props }) => <strong {...props} className="font-semibold" />,
          img: ({ node, ...props }) => (
            <img {...props} className="w-full max-w-sm rounded-lg shadow-md my-4 object-cover border border-gray-200 dark:border-gray-700" loading="lazy" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};