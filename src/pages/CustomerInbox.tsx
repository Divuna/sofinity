import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Clock, User, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Conversation {
  id: string;
  user_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
  status: string | null;
  assigned_admin: string | null;
  ai_first_response: boolean | null;
  ai_last_classification: string | null;
  created_at: string | null;
}

interface Message {
  id: string;
  user_id: string;
  sender: string;
  content: string;
  title: string | null;
  source_system: string;
  is_ai: boolean | null;
  read: boolean | null;
  created_at: string | null;
  ai_classification: string | null;
  ai_confidence: number | null;
  related_message_id: string | null;
}

const CustomerInbox = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['customer_conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['customer_messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) return [];

      const { data, error } = await supabase
        .from('customer_messages')
        .select('*')
        .eq('user_id', conversation.user_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversationId,
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !replyText.trim()) return;

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) throw new Error('Konverzace nenalezena');

      // Insert new message
      const { error: messageError } = await supabase
        .from('customer_messages')
        .insert({
          user_id: conversation.user_id,
          sender: 'admin',
          content: replyText,
          source_system: 'sofinity',
          is_ai: false,
          read: true,
        });

      if (messageError) throw messageError;

      // Update conversation
      const { error: conversationError } = await supabase
        .from('customer_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: replyText.substring(0, 100),
          unread_count: 0,
        })
        .eq('id', selectedConversationId);

      if (conversationError) throw conversationError;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['customer_messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['customer_conversations'] });
      toast({
        title: 'Zpráva odeslána',
        description: 'Vaše odpověď byla úspěšně odeslána.',
      });
    },
    onError: (error) => {
      console.error('Error sending reply:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se odeslat zprávu.',
        variant: 'destructive',
      });
    },
  });

  const handleSendReply = () => {
    if (replyText.trim()) {
      sendReplyMutation.mutate();
    }
  };

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      open: { label: 'Otevřená', variant: 'default' },
      in_progress: { label: 'Probíhá', variant: 'secondary' },
      resolved: { label: 'Vyřešená', variant: 'outline' },
      closed: { label: 'Uzavřená', variant: 'secondary' },
      requires_admin: { label: 'Vyžaduje správce', variant: 'destructive' },
    };

    const config = statusMap[status || 'open'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Načítání konverzací...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          Zákaznická Schránka
        </h1>
        <p className="text-muted-foreground mt-2">Správa konverzací se zákazníky</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className={`${selectedConversationId ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {conversations?.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted ${
                    selectedConversationId === conversation.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground truncate">
                          {conversation.user_id.substring(0, 8)}...
                        </span>
                        {getStatusBadge(conversation.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {conversation.last_message_preview || 'Bez zprávy'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {conversation.last_message_at
                            ? format(new Date(conversation.last_message_at), 'dd.MM.yyyy HH:mm', { locale: cs })
                            : 'N/A'}
                        </div>
                        {(conversation.unread_count || 0) > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!conversations?.length && (
                <div className="p-8 text-center text-muted-foreground">
                  Žádné konverzace
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Detail */}
        {selectedConversationId && (
          <Card className="lg:col-span-2">
            <CardContent className="p-0 flex flex-col h-[600px]">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversationId(null)}
                  className="lg:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {selectedConversation?.user_id.substring(0, 8)}...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedConversation?.status || 'Neznámý stav'}
                  </div>
                </div>
                {getStatusBadge(selectedConversation?.status || null)}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground">Načítání zpráv...</div>
                ) : (
                  messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs opacity-75">
                            {message.sender === 'admin' ? 'Admin' : 'Zákazník'}
                          </span>
                          {message.is_ai && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              🤖 AI
                            </Badge>
                          )}
                          {message.ai_confidence && (
                            <span className="text-xs opacity-70">
                              Jistota: {(message.ai_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="text-xs opacity-75 mt-1">
                          {message.created_at
                            ? format(new Date(message.created_at), 'dd.MM.yyyy HH:mm', { locale: cs })
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {!messages?.length && !messagesLoading && (
                  <div className="text-center text-muted-foreground">Žádné zprávy v konverzaci</div>
                )}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Napište odpověď..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendReplyMutation.isPending}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Stiskněte Enter pro odeslání, Shift+Enter pro nový řádek
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerInbox;
