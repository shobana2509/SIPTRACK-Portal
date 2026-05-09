import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBox } from './ChatBox';
import { User, chat } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface FloatingChatProps {
  currentUser: User;
  industryId: string;
  otherPartyName: string;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({ currentUser, industryId, otherPartyName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = async () => {
    if (isOpen) return;
    try {
      const messages = await chat.getMessages(industryId);
      const unread = messages.filter(m => 
        m.receiverId === currentUser.id && 
        !m.isRead && 
        !m.isDeletedForEveryone &&
        !m.deletedByReceiver
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to check unread', err);
    }
  };

  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, [industryId, isOpen]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] max-w-[90vw] shadow-2xl rounded-2xl overflow-hidden"
          >
            <ChatBox 
              currentUser={currentUser} 
              industryId={industryId} 
              otherPartyName={otherPartyName} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            h-14 w-14 rounded-full shadow-lg p-0
            ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}
          `}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
        
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-background shadow-sm"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
