import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, User, Clock, Eraser, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { chat, ChatMessage, User as UserType, getUsers, getIndustries } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatBoxProps {
  currentUser: UserType;
  industryId: string;
  otherPartyName: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ currentUser, industryId, otherPartyName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const findReceiver = async () => {
      const allUsers = await getUsers();
      if (currentUser.role === 'industry_admin') {
        const industries = await getIndustries();
        const myIndustry = industries.find(ind => ind.id === industryId);
        
        if (myIndustry) {
          const sipcotAdmin = allUsers.find(u => u.role === 'sipcot_admin' && u.sipcotId === myIndustry.sipcotId);
          if (sipcotAdmin) setReceiverId(sipcotAdmin.id);
        }
      } else {
        const industryAdmin = allUsers.find(u => u.role === 'industry_admin' && u.industryId === industryId);
        if (industryAdmin) setReceiverId(industryAdmin.id);
      }
    };
    findReceiver();
  }, [industryId, currentUser]);

  const loadMessages = async () => {
    try {
      const data = await chat.getMessages(industryId);
      // Hard filtered in DB now, but we'll keep the client-side check for robustness
      const filtered = data.filter(m => {
        if (m.isDeletedForEveryone) return false;
        if (m.senderId === currentUser.id && m.deletedBySender) return false;
        if (m.receiverId === currentUser.id && m.deletedByReceiver) return false;
        return true;
      });
      setMessages(filtered);
      
      // Auto-mark as read if there are unread messages for me
      const hasUnread = filtered.some(m => m.receiverId === currentUser.id && !m.isRead);
      if (hasUnread) {
        await chat.markRead(industryId, currentUser.id);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [industryId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !receiverId) return;

    try {
      await chat.sendMessage({
        senderId: currentUser.id,
        receiverId,
        industryId,
        message: newMessage.trim()
      });
      setNewMessage('');
      loadMessages();
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Per latest request, this now performs a physical DELETE in the backend
      await chat.deleteMessage(id, 'everyone', currentUser.id);
      toast.success('Message deleted permanently');
      loadMessages();
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear your chat history? This will only affect your view.')) return;
    
    try {
      await chat.clearMessages(industryId, currentUser.id);
      toast.success('Chat history cleared permanently');
      loadMessages();
    } catch (err) {
      toast.error('Failed to clear chat');
    }
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="flex flex-col h-[500px] border-0 shadow-xl overflow-hidden bg-background">
      <CardHeader className="bg-primary py-3 px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-primary-foreground text-sm flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold">{otherPartyName}</p>
              <p className="text-[10px] opacity-70">Official Correspondence</p>
            </div>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground hover:bg-primary-foreground/10 text-[10px] h-7 gap-1"
            onClick={handleClearChat}
          >
            <Eraser className="h-3 w-3" /> Clear Chat
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative bg-[#f8f9fa]">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-8">
              <Clock className="h-12 w-12 mb-2" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] relative group ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      px-4 py-2.5 rounded-2xl text-[13px] shadow-sm leading-relaxed
                      ${isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'}
                    `}>
                      <p>{msg.message}</p>
                      <div className={`text-[9px] mt-1 flex items-center gap-1 ${isMe ? 'opacity-70 text-white' : 'text-slate-400'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>

                    {isMe && (
                      <div className={`
                        absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                        ${isMe ? '-left-8' : '-right-8'}
                      `}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isMe ? "end" : "start"} className="text-xs">
                            <DropdownMenuItem 
                              onClick={() => handleDelete(msg.id)}
                              className="text-destructive gap-2 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2 shrink-0">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-stone-50 rounded-full border-stone-200 focus-visible:ring-primary h-10"
            disabled={!receiverId}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full h-10 w-10 shrink-0 bg-primary shadow-lg hover:shadow-xl transition-all"
            disabled={!newMessage.trim() || !receiverId}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
