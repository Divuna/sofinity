import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface NotificationQueueItem {
  id: string;
  event_id: string;
  event_name: string;
  user_id: string;
  payload: any;
  status: string;
  created_at: string;
}

export function RealtimeNotificationFeed() {
  const [notifications, setNotifications] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('NotificationQueue')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('notification-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'NotificationQueue'
        },
        (payload) => {
          console.log('NotificationQueue change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as NotificationQueueItem;
            setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
            
            toast({
              title: "Nová notifikace",
              description: newNotification.event_name,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as NotificationQueueItem;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('NotificationQueue')
        .update({ status: 'sent' })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'sent' } : n
        )
      );

      toast({
        title: "Označeno jako přečtené",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se označit notifikaci jako přečtenou",
        variant: "destructive"
      });
    }
  };

  const getMessageText = (notification: NotificationQueueItem): string => {
    if (notification.payload?.message) {
      return notification.payload.message;
    }
    if (notification.payload?.title) {
      return notification.payload.title;
    }
    return 'Nová událost';
  };

  const unreadCount = notifications.filter(n => n.status !== 'sent').length;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Načítám notifikace...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikace
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Žádné notifikace
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer ${
                    notification.status === 'sent' ? 'opacity-60' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {notification.event_name}
                        </p>
                        {notification.status === 'sent' && (
                          <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getMessageText(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleString('cs-CZ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
