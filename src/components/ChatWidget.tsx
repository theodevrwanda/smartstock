
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getAIResponse, Message as AIMessage } from '@/services/aiService';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UIMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<UIMessage[]>([
        {
            id: '1',
            role: 'model',
            text: 'Hello! 👋 I am ST AI by RwandaScratch. How can I help you with SmartStock today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: UIMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        const userInput = input; // Save input before clearing
        setInput('');
        setIsLoading(true);

        try {
            const history: AIMessage[] = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const aiResponse = await getAIResponse(history, userInput);

            const modelMsg: UIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: aiResponse,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, modelMsg]);
        } catch (error: any) {
            console.error("Chat Error:", error);
            // Show error in chat
            const errorMsg: UIMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `DEBUG ERROR: ${error?.message || error}\n\nStack: ${error?.stack || 'No stack'}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessageContent = (text: string) => {
        // Simple parser for [BUTTON: Label](URL)
        const parts = text.split(/(\[BUTTON:.*?\]\(.*?\))/g);

        return parts.map((part, index) => {
            const buttonMatch = part.match(/\[BUTTON: (.*?)\]\((.*?)\)/);
            if (buttonMatch) {
                const [, label, url] = buttonMatch;
                return (
                    <div key={index} className="mt-3">
                        <Button
                            asChild
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                        >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                {label}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </Button>
                    </div>
                );
            }
            return <p key={index} className="text-sm whitespace-pre-wrap">{part}</p>;
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-24 right-6 w-[90vw] sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    style={{ maxHeight: '80vh', height: '600px' }}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-primary text-primary-foreground flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Bot className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold leading-none">ST AI Support</h3>
                                <p className="text-[10px] opacity-80 mt-1">Developed by RwandaScratch</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:bg-black/20 p-2 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-secondary/10 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-primary/20' : 'bg-secondary'
                                        }`}>
                                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                        : 'bg-card border border-border rounded-tl-none'
                                        }`}>
                                        {renderMessageContent(message.text)}
                                        <span className={`text-[10px] mt-1 block opacity-50 ${message.role === 'user' ? 'text-right' : ''}`}>
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[85%]">
                                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-primary animate-pulse" />
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-background">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about SmartStock..."
                                className="flex-1 px-4 py-2.5 text-sm border border-border rounded-xl bg-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="rounded-xl shadow-md transition-transform active:scale-95"
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatWidget;
