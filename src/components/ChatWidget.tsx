
import React from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-24 right-6 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    style={{ maxHeight: '600px', height: '500px' }}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-primary text-primary-foreground flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">Chat with Support</h3>
                            <p className="text-xs opacity-80">Typically replies in a few minutes</p>
                        </div>
                        <button onClick={onClose} className="hover:bg-black/20 p-2 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-4 overflow-y-auto bg-secondary/30">
                        <div className="bg-card p-3 rounded-xl rounded-tl-none shadow-sm max-w-[80%] mb-4">
                            <p className="text-sm">Hello! 👋 How can we help you with your inventory today?</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-background">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 text-sm border border-border rounded-xl bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <Button size="icon" className="rounded-xl">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatWidget;
