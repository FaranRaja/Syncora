import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, Message } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, Paperclip, Image, Film, X, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  friend: Profile | null;
  onViewProfile: (friend: Profile) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ friend, onViewProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!user || !friend) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', friend.id)
        .eq('receiver_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!user || !friend) return;

    const channel = supabase
      .channel(`messages-${user.id}-${friend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${friend.id}),and(sender_id=eq.${friend.id},receiver_id=eq.${user.id}))`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friend]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMediaType = (file: File): 'image' | 'video' | 'file' | 'gif' => {
    if (file.type === 'image/gif') return 'gif';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user || !friend) return;

    setLoading(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | 'file' | 'gif' | null = null;
      let fileName: string | null = null;

      if (selectedFile) {
        mediaUrl = await uploadFile(selectedFile);
        if (!mediaUrl) {
          throw new Error('Failed to upload file');
        }
        mediaType = getMediaType(selectedFile);
        fileName = selectedFile.name;
      }

      const messageContent = newMessage.trim() || null;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: friend.id,
          content: messageContent,
          media_url: mediaUrl,
          media_type: mediaType,
          file_name: fileName
        })
        .select()
        .single();

      if (error) throw error;

      // Add message to local state immediately
      if (data) {
        setMessages(prev => [...prev, data as Message]);
      }

      // Create notification for receiver
      await supabase
        .from('notifications')
        .insert({
          user_id: friend.id,
          type: 'message',
          content: `New message from ${user.email?.split('@')[0]}`,
          related_id: user.id
        });

      setNewMessage('');
      clearSelectedFile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMedia = (message: Message) => {
    if (!message.media_url) return null;

    switch (message.media_type) {
      case 'image':
      case 'gif':
        return (
          <img 
            src={message.media_url} 
            alt="Shared image" 
            className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.media_url!, '_blank')}
          />
        );
      case 'video':
        return (
          <video 
            src={message.media_url} 
            controls 
            className="max-w-full rounded-lg max-h-64"
          />
        );
      case 'file':
        return (
          <a 
            href={message.media_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm truncate max-w-[150px]">{message.file_name || 'Download file'}</span>
            <Download className="h-4 w-4" />
          </a>
        );
      default:
        return null;
    }
  };

  if (!friend) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg">Select a friend to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar 
          className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onViewProfile(friend)}
        >
          <AvatarImage src={friend.avatar_url || undefined} />
          <AvatarFallback>
            {friend.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{friend.username}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    isOwn 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {renderMedia(message)}
                  {message.content && (
                    <p className={cn("break-words", message.media_url && "mt-2")}>{message.content}</p>
                  )}
                  <p className={cn(
                    "text-xs mt-1",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex items-center gap-2">
            {previewUrl && selectedFile.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : previewUrl && selectedFile.type.startsWith('video/') ? (
              <video src={previewUrl} className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearSelectedFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileSelect}
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || (!newMessage.trim() && !selectedFile)}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;
