import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2,
  Filter,
  Mail,
  AlertCircle,
  Info,
  CheckCircle,
  X
} from 'lucide-react';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean | null;
  sent_at: string;
  user_id: string | null;
}

const notificationIcons = {
  email: Mail,
  alert: AlertCircle,
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
};

const notificationColors = {
  email: 'default',
  alert: 'destructive',
  info: 'default',
  success: 'default',
  warning: 'default',
} as const;

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('Notifications')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst notifikace",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );

      toast({
        title: "Označeno",
        description: "Notifikace byla označena jako přečtená"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se označit notifikaci",
        variant: "destructive"
      });
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Notifications')
        .update({ read: false })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: false } : notif
        )
      );

      toast({
        title: "Označeno",
        description: "Notifikace byla označena jako nepřečtená"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se označit notifikaci",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('Notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== id));
      setSelectedNotifications(prev => prev.filter(selectedId => selectedId !== id));

      toast({
        title: "Smazáno",
        description: "Notifikace byla odstraněna"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat notifikaci",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: 'read' | 'unread' | 'delete') => {
    if (selectedNotifications.length === 0) {
      toast({
        title: "Žádný výběr",
        description: "Vyberte notifikace pro hromadnou akci",
        variant: "destructive"
      });
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('Notifications')
          .delete()
          .in('id', selectedNotifications);

        if (error) throw error;
        
        setNotifications(prev => 
          prev.filter(notif => !selectedNotifications.includes(notif.id))
        );
        
        toast({
          title: "Smazáno",
          description: `${selectedNotifications.length} notifikací bylo odstraněno`
        });
      } else {
        const { error } = await supabase
          .from('Notifications')
          .update({ read: action === 'read' })
          .in('id', selectedNotifications);

        if (error) throw error;
        
        setNotifications(prev => 
          prev.map(notif => 
            selectedNotifications.includes(notif.id) 
              ? { ...notif, read: action === 'read' }
              : notif
          )
        );
        
        toast({
          title: "Stav změněn",
          description: `${selectedNotifications.length} notifikací bylo označeno jako ${action === 'read' ? 'přečtené' : 'nepřečtené'}`
        });
      }

      setSelectedNotifications([]);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se provést hromadnou akci",
        variant: "destructive"
      });
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    
    const matchesRead = 
      readFilter === 'all' ||
      (readFilter === 'read' && notification.read) ||
      (readFilter === 'unread' && !notification.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const toggleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedNotifications(
      selectedNotifications.length === filteredNotifications.length 
        ? [] 
        : filteredNotifications.map(notification => notification.id)
    );
  };

  const getNotificationIcon = (type: string) => {
    return notificationIcons[type as keyof typeof notificationIcons] || Bell;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Centrum notifikací{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Přehled všech upozornění a systémových zpráv
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {unreadCount} nepřečtených
          </Badge>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-primary" />
              <div className="text-2xl font-bold">{notifications.length}</div>
            </div>
            <p className="text-xs text-muted-foreground">Celkem notifikací</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BellOff className="w-4 h-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{unreadCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Nepřečtené</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <div className="text-2xl font-bold">
                {notifications.filter(n => n.read).length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Přečtené</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <div className="text-2xl font-bold">
                {notifications.filter(n => n.type === 'alert' || n.type === 'warning').length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Upozornění</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat notifikace..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle typu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="alert">Upozornění</SelectItem>
                <SelectItem value="info">Informace</SelectItem>
                <SelectItem value="success">Úspěch</SelectItem>
                <SelectItem value="warning">Varování</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle stavu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="unread">Nepřečtené</SelectItem>
                <SelectItem value="read">Přečtené</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                Vybráno {selectedNotifications.length} notifikací:
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('read')}
              >
                <Check className="w-4 h-4 mr-1" />
                Označit jako přečtené
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('unread')}
              >
                <X className="w-4 h-4 mr-1" />
                Označit jako nepřečtené
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('delete')}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Smazat
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedNotifications([])}
              >
                Zrušit výběr
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifikace ({filteredNotifications.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Vybrat vše</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání notifikací...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border border-border rounded-lg hover:shadow-soft transition-all duration-300 ${
                      !notification.read ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedNotifications.includes(notification.id)}
                        onCheckedChange={() => toggleSelectNotification(notification.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <NotificationIcon 
                              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                notification.type === 'alert' || notification.type === 'warning' 
                                  ? 'text-destructive' 
                                  : notification.type === 'success'
                                  ? 'text-success'
                                  : 'text-primary'
                              }`} 
                            />
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h3>
                                <Badge 
                                  variant={notificationColors[notification.type as keyof typeof notificationColors]}
                                  className="text-xs"
                                >
                                  {notification.type}
                                </Badge>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="text-xs text-muted-foreground">
                                {new Date(notification.sent_at).toLocaleString('cs-CZ')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {notification.read ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsUnread(notification.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Žádné notifikace nenalezeny</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}