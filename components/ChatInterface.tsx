import React, { useRef, useEffect } from 'react';
import { Send, Map, Globe, MessageSquare, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { ChatMessage, AppMode, GroundingMetadata } from '../types';
import { MODES } from '../constants';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  currentMode: AppMode;
  onSend: (text: string) => void;
  onModeChange: (mode: AppMode) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  currentMode,
  onSend,
  onModeChange,
  inputValue,
  onInputChange,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue);
      onInputChange('');
    }
  };

  const renderSources = (metadata?: GroundingMetadata) => {
    if (!metadata) return null;

    const { mapChunks, searchChunks } = metadata;
    const hasMaps = mapChunks && mapChunks.length > 0;
    const hasSearch = searchChunks && searchChunks.length > 0;

    if (!hasMaps && !hasSearch) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-semibold text-gray-500 mb-2 uppercase tracking-wider">Sources</p>
        <div className="flex flex-wrap gap-2">
          {hasMaps && mapChunks.map((chunk, idx) => {
            const uri = chunk.maps?.source?.uri;
            if (!uri) return null;
            return (
              <a
                key={`map-${idx}`}
                href={uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{chunk.maps.title || 'Map Location'}</span>
              </a>
            );
          })}
          {hasSearch && searchChunks.map((chunk, idx) => {
            const uri = chunk.web?.uri;
            if (!uri) return null;
            return (
              <a
                key={`search-${idx}`}
                href={uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{chunk.web.title || 'Web Source'}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Header / Mode Selector */}
      <div className="bg-slate-50 dark:bg-slate-950 p-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1 justify-between bg-gray-200 dark:bg-slate-800 p-1 rounded-lg">
          {MODES.map((mode) => {
            const Icon = mode.icon === 'Map' ? Map : mode.icon === 'Globe' ? Globe : MessageSquare;
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-slate-700/50'
                }`}
                title={mode.description}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-8 opacity-60">
            <div className="bg-blue-100 dark:bg-slate-800 p-4 rounded-full mb-4">
               <Map className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">GeoGuide AI</p>
            <p className="text-sm">Ask about places, check web info, or chat.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-gray-100 dark:border-gray-700'
              }`}
            >
              <MarkdownRenderer content={msg.text} />
              {msg.role === 'model' && renderSources(msg.groundingMetadata)}
              {msg.showDiscoverButton && (
                <div className="mt-3">
                  <button 
                    onClick={() => {
                        onModeChange(AppMode.MAPS);
                        window.dispatchEvent(new CustomEvent('map-discover-click'));
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-full text-sm font-medium transition-all shadow-sm"
                  >
                    <Globe size={16} />
                    Discover other areas
                  </button>
                </div>
              )}
              <div
                className={`text-[10px] mt-1 text-right opacity-70 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-gray-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={`Ask about ${currentMode === AppMode.MAPS ? 'places nearby' : currentMode === AppMode.SEARCH ? 'events & news' : 'anything'}...`}
            className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-slate-900 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 rounded-xl text-slate-900 dark:text-white placeholder-gray-400 transition-all outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};