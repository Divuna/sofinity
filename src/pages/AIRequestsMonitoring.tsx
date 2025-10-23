import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Clock, CheckCircle2, AlertCircle, Radio, X, AlertTriangle, Bell, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDistanceToNow, subHours } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AICampaignLinkOverview from '@/components/Dashboard/AICampaignLinkOverview';

interface DashboardViewItem {
  type: string;
  total_requests: number;
  completed_count: number;
  error_count: number;
  success_rate_pct: number;
  avg_completion_time_s: number;
  last_status: string;
  last_change_at: string;
}

interface Trend7dItem {
  day: string;
  type: string;
  total_requests_7d: number;
  avg_success_7d_pct: number;
  avg_time_7d_s: number;
}

interface PerformanceItem {
  day: string;
  type: string;
  total_requests: number;
  completed_count: number;
  error_count: number;
  success_rate_pct: number;
  avg_completion_time_s: number;
}

interface LastActivity {
  airequest_id: string;
  new_status: string;
  changed_at: string;
  type: string;
}

interface NotificationQueueItem {
  id: string;
  event_id: string | null;
  event_name: string;
  user_id: string | null;
  payload: any;
  status: string;
  created_at: string;
  target_email: string | null;
}

// Configurable threshold for error rate alert
const ERROR_RATE_THRESHOLD = 10;

export default function AIRequestsMonitoring() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardViewItem[]>([]);
  const [trendData, setTrendData] = useState<Trend7dItem[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequests, setActiveRequests] = useState<number>(0);
  const [completedLastHour, setCompletedLastHour] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [realtimeLoading, setRealtimeLoading] = useState(true);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorAlertDismissed, setErrorAlertDismissed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const hasShownToast = useRef(false);
  
  // Notification Queue State
  const [notificationQueue, setNotificationQueue] = useState<NotificationQueueItem[]>([]);
  const [notificationStatusFilter, setNotificationStatusFilter] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<NotificationQueueItem | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard view
      const { data: dashData, error: dashError } = await supabase
        .from('AIRequests_DashboardView' as any)
        .select('*');

      if (dashError) throw dashError;

      // Fetch 7-day trend
      const { data: trendData, error: trendError } = await supabase
        .from('AIRequests_Trend7dView' as any)
        .select('*')
        .order('day', { ascending: true });

      if (trendError) throw trendError;

      // Fetch performance view
      const { data: perfData, error: perfError } = await supabase
        .from('AIRequests_PerformanceView' as any)
        .select('*')
        .order('day', { ascending: false })
        .limit(30);

      if (perfError) throw perfError;

      setDashboardData((dashData as any[]) || []);
      setTrendData((trendData as any[]) || []);
      setPerformanceData((perfData as any[]) || []);

      // Check error rate
      checkErrorRate((dashData as any[]) || []);
      
      // Trigger refresh for child components
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkErrorRate = (data: DashboardViewItem[]) => {
    if (data.length === 0) return;

    const totalRequests = data.reduce((sum, item) => sum + item.total_requests, 0);
    const totalErrors = data.reduce((sum, item) => sum + item.error_count, 0);
    const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    const shouldShowAlert = overallErrorRate > ERROR_RATE_THRESHOLD;

    // Check if we should show alert (not dismissed in session)
    const dismissed = sessionStorage.getItem('errorAlertDismissed') === 'true';
    setErrorAlertDismissed(dismissed);
    setShowErrorAlert(shouldShowAlert && !dismissed);

    // Show toast only once when threshold is crossed
    if (shouldShowAlert && !hasShownToast.current && !dismissed) {
      toast({
        title: "Varování: zvýšená chybovost",
        description: `Celková chybovost dosáhla ${overallErrorRate.toFixed(1)}%`,
        variant: "destructive"
      });
      hasShownToast.current = true;
    }

    // Reset toast flag if error rate drops below threshold
    if (!shouldShowAlert) {
      hasShownToast.current = false;
    }
  };

  const dismissErrorAlert = () => {
    sessionStorage.setItem('errorAlertDismissed', 'true');
    setErrorAlertDismissed(true);
    setShowErrorAlert(false);
  };

  const handleAlertClick = () => {
    // Scroll to table
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Apply filter to show only types with errors
    setTimeout(() => {
      setTypeFilter('errors');
    }, 500);
  };

  const fetchRealtimeData = async () => {
    try {
      // Fetch active requests count (status = 'waiting')
      const { count: activeCount, error: activeError } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      if (activeError) throw activeError;

      // Fetch completed requests in the last hour
      const oneHourAgo = subHours(new Date(), 1).toISOString();
      const { count: completedCount, error: completedError } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', oneHourAgo);

      if (completedError) throw completedError;

      // Fetch last activity from audit log
      const { data: activityData, error: activityError } = await supabase
        .from('AIRequests_AuditLog' as any)
        .select('airequest_id, new_status, changed_at')
        .order('changed_at', { ascending: false })
        .limit(1)
        .single();

      if (activityError && activityError.code !== 'PGRST116') {
        throw activityError;
      }

      // Get the request type for the last activity
      if (activityData) {
        const { data: requestData } = await supabase
          .from('AIRequests')
          .select('type')
          .eq('id', (activityData as any).airequest_id)
          .single();

        setLastActivity({
          airequest_id: (activityData as any).airequest_id,
          new_status: (activityData as any).new_status,
          changed_at: (activityData as any).changed_at,
          type: requestData?.type || 'unknown'
        });
      }

      setActiveRequests(activeCount || 0);
      setCompletedLastHour(completedCount || 0);
      setRealtimeLoading(false);
    } catch (error) {
      console.error('Error fetching realtime data:', error);
      setRealtimeLoading(false);
    }
  };

  const fetchNotificationQueue = async () => {
    try {
      setNotificationLoading(true);
      const { data, error } = await supabase
        .from('NotificationQueue')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotificationQueue(data || []);
    } catch (error) {
      console.error('Error fetching notification queue:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst frontu notifikací",
        variant: "destructive"
      });
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    fetchRealtimeData();
    fetchNotificationQueue();
    
    // Auto-refresh dashboard data every 30 seconds
    const dashboardInterval = setInterval(fetchMonitoringData, 30000);
    
    // Auto-refresh realtime data every 10 seconds
    const realtimeInterval = setInterval(fetchRealtimeData, 10000);
    
    // Auto-refresh notification queue every 30 seconds
    const notificationInterval = setInterval(fetchNotificationQueue, 30000);
    
    return () => {
      clearInterval(dashboardInterval);
      clearInterval(realtimeInterval);
      clearInterval(notificationInterval);
      sessionStorage.removeItem('errorAlertDismissed');
    };
  }, []);

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'campaign_generator': 'Generátor kampaní',
      'email_assistant': 'Email asistent',
      'autoresponder': 'Autoresponder',
      'evaluator': 'Vyhodnocovač',
      'event_forward': 'Přeposílání událostí'
    };
    return typeMap[type] || type;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'waiting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  // Calculate overall metrics
  const totalRequests = dashboardData.reduce((sum, item) => sum + item.total_requests, 0);
  const totalCompleted = dashboardData.reduce((sum, item) => sum + item.completed_count, 0);
  const totalErrors = dashboardData.reduce((sum, item) => sum + item.error_count, 0);
  const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  const avgSuccessRate = dashboardData.length > 0
    ? dashboardData.reduce((sum, item) => sum + item.success_rate_pct, 0) / dashboardData.length
    : 0;
  const avgProcessingTime = dashboardData.length > 0
    ? dashboardData.reduce((sum, item) => sum + item.avg_completion_time_s, 0) / dashboardData.length
    : 0;

  // Get types with high error rates
  const typesWithErrors = dashboardData.filter(item => {
    const errorRate = item.total_requests > 0 ? (item.error_count / item.total_requests) * 100 : 0;
    return errorRate > ERROR_RATE_THRESHOLD;
  });

  // Filter dashboard data based on filter
  const filteredDashboardData = typeFilter === 'errors' 
    ? typesWithErrors 
    : dashboardData;

  // Filter notification queue
  const filteredNotifications = notificationStatusFilter === 'all'
    ? notificationQueue
    : notificationQueue.filter(n => n.status === notificationStatusFilter);

  const getNotificationStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-600">Odesláno</Badge>;
      case 'pending':
        return <Badge variant="secondary">Čeká</Badge>;
      case 'failed':
        return <Badge variant="destructive">Selhalo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Rate Alert Banner */}
      {showErrorAlert && (
        <Alert className="sticky top-0 z-50 border-destructive bg-destructive/10 shadow-lg">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex-1 cursor-pointer" onClick={handleAlertClick}>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-destructive">
                  Varování: zvýšená chybovost
                </span>
                <Badge variant="destructive" className="font-semibold">
                  Chyby celkem: {overallErrorRate.toFixed(1)}%
                </Badge>
                {typesWithErrors.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">podle typů:</span>
                    {typesWithErrors.map((item) => {
                      const errorRate = item.total_requests > 0 ? (item.error_count / item.total_requests) * 100 : 0;
                      return (
                        <Badge key={item.type} variant="outline" className="border-destructive text-destructive">
                          {getTypeLabel(item.type)}: {errorRate.toFixed(1)}%
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-4 h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                dismissErrorAlert();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI & Kampaně</h1>
          <p className="text-muted-foreground mt-1">
            Monitoring a analýza výkonu AI požadavků a notifikací
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifikace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Live Counters */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivní požadavky</CardTitle>
            <div className="relative">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-primary rounded-full animate-ping"></span>
            </div>
          </CardHeader>
          <CardContent>
            {realtimeLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">--</div>
            ) : (
              <div className="text-2xl font-bold text-primary">{activeRequests}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Čekající na zpracování
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokončeno za poslední hodinu</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {realtimeLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">--</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{completedLastHour}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Úspěšně zpracováno
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poslední aktivita AI</CardTitle>
            <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            {realtimeLoading || !lastActivity ? (
              <div className="text-sm text-muted-foreground">Načítání...</div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(lastActivity.new_status)} className="text-xs">
                    {lastActivity.new_status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getTypeLabel(lastActivity.type)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lastActivity.changed_at), {
                    addSuffix: true,
                    locale: cs
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkem požadavků</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              Všechny typy AI požadavků
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Úspěšnost</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Průměrná míra úspěšnosti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Průměrná doba zpracování</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(avgProcessingTime)}</div>
            <p className="text-xs text-muted-foreground">
              Čas dokončení požadavku
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chyby</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              Celkem chybných požadavků
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Status Table */}
      <Card ref={tableRef}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktuální stav požadavků
              </CardTitle>
              <CardDescription>
                Přehled všech typů AI požadavků a jejich metriky
              </CardDescription>
            </div>
            {typeFilter === 'errors' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTypeFilter(null)}
              >
                Zrušit filtr
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredDashboardData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {typeFilter === 'errors' 
                ? 'Žádné typy s vysokou chybovostí'
                : 'Žádná data k zobrazení'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ požadavku</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead className="text-right">Dokončeno</TableHead>
                  <TableHead className="text-right">Chyby</TableHead>
                  <TableHead className="text-right">Úspěšnost</TableHead>
                  <TableHead className="text-right">Průměrný čas</TableHead>
                  <TableHead>Poslední stav</TableHead>
                  <TableHead>Poslední změna</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDashboardData.map((item, index) => {
                  const itemErrorRate = item.total_requests > 0 ? (item.error_count / item.total_requests) * 100 : 0;
                  const isHighErrorRate = itemErrorRate > ERROR_RATE_THRESHOLD;
                  
                  return (
                    <TableRow 
                      key={index}
                      className={isHighErrorRate ? 'bg-destructive/5 border-l-4 border-l-destructive' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isHighErrorRate && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {getTypeLabel(item.type)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.total_requests}</TableCell>
                      <TableCell className="text-right">{item.completed_count}</TableCell>
                      <TableCell className="text-right">
                        <span className={isHighErrorRate ? 'font-semibold text-destructive' : ''}>
                          {item.error_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.success_rate_pct >= 90 ? 'text-green-600' : item.success_rate_pct >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {item.success_rate_pct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatTime(item.avg_completion_time_s)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.last_status)}>
                          {item.last_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.last_change_at), {
                          addSuffix: true,
                          locale: cs
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Success Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Úspěšnost za 7 dní
          </CardTitle>
          <CardDescription>
            Trend úspěšnosti AI požadavků za posledních 7 dní
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin" />
            </div>
          ) : trendData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Žádná data k zobrazení
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Úspěšnost (%)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Počet požadavků', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('cs-CZ')}
                  formatter={(value: any, name: string) => {
                    if (name === 'Úspěšnost') return [`${Number(value).toFixed(1)}%`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avg_success_7d_pct" 
                  stroke="hsl(var(--primary))" 
                  name="Úspěšnost"
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="total_requests_7d" 
                  stroke="hsl(var(--secondary))" 
                  name="Počet požadavků"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Výkonové metriky
          </CardTitle>
          <CardDescription>
            Průměrná doba zpracování podle typu požadavku za posledních 30 dní
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin" />
            </div>
          ) : performanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Žádná data k zobrazení
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by type and calculate averages */}
              {Object.entries(
                performanceData.reduce((acc, item) => {
                  if (!acc[item.type]) {
                    acc[item.type] = {
                      total_requests: 0,
                      completed_count: 0,
                      error_count: 0,
                      total_time: 0,
                      count: 0
                    };
                  }
                  acc[item.type].total_requests += item.total_requests;
                  acc[item.type].completed_count += item.completed_count;
                  acc[item.type].error_count += item.error_count;
                  acc[item.type].total_time += item.avg_completion_time_s * item.total_requests;
                  acc[item.type].count += item.total_requests;
                  return acc;
                }, {} as Record<string, any>)
              ).map(([type, metrics]) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{getTypeLabel(type)}</h4>
                    <Badge variant="outline">{metrics.total_requests} požadavků</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Průměrný čas</p>
                      <p className="font-semibold">{formatTime(metrics.total_time / metrics.count)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dokončeno</p>
                      <p className="font-semibold text-green-600">{metrics.completed_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chyby</p>
                      <p className="font-semibold text-red-600">{metrics.error_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Campaign Link Overview */}
      <AICampaignLinkOverview refreshTrigger={refreshTrigger} loading={loading} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          {/* Notification Queue Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Celkem notifikací</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificationQueue.length}</div>
                <p className="text-xs text-muted-foreground">
                  Všechny notifikace ve frontě
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Čekající</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {notificationQueue.filter(n => n.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Čekají na odeslání
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Odesláno</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {notificationQueue.filter(n => n.status === 'sent').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Úspěšně doručeno
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notification Queue Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Fronta notifikací
                  </CardTitle>
                  <CardDescription>
                    Seznam všech notifikací a jejich stav
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="border rounded-md px-3 py-1.5 text-sm"
                    value={notificationStatusFilter}
                    onChange={(e) => setNotificationStatusFilter(e.target.value)}
                  >
                    <option value="all">Všechny stavy</option>
                    <option value="pending">Čekající</option>
                    <option value="sent">Odesláno</option>
                    <option value="failed">Selhalo</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notificationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Activity className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Žádné notifikace k zobrazení
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Událost</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Cílový email</TableHead>
                      <TableHead>Vytvořeno</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.map((notification) => (
                      <TableRow 
                        key={notification.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedNotification(notification)}
                      >
                        <TableCell className="font-medium">
                          {notification.event_name}
                        </TableCell>
                        <TableCell>
                          {getNotificationStatusBadge(notification.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {notification.target_email || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: cs
                          })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Detail Sheet */}
      <Sheet open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Detail notifikace
            </SheetTitle>
            <SheetDescription>
              Úplné informace o notifikaci
            </SheetDescription>
          </SheetHeader>
          
          {selectedNotification && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">ID</h3>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedNotification.id}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Název události</h3>
                  <p className="text-sm">{selectedNotification.event_name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Stav</h3>
                  {getNotificationStatusBadge(selectedNotification.status)}
                </div>

                {selectedNotification.target_email && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Cílový email</h3>
                    <p className="text-sm">{selectedNotification.target_email}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Vytvořeno</h3>
                  <p className="text-sm">
                    {new Date(selectedNotification.created_at).toLocaleString('cs-CZ')}
                  </p>
                </div>

                {selectedNotification.event_id && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">ID události</h3>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{selectedNotification.event_id}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Payload (JSON)</h3>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96 border">
                    {JSON.stringify(selectedNotification.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
