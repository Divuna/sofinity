import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

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

export default function AIRequestsMonitoring() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardViewItem[]>([]);
  const [trendData, setTrendData] = useState<Trend7dItem[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
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
  const avgSuccessRate = dashboardData.length > 0
    ? dashboardData.reduce((sum, item) => sum + item.success_rate_pct, 0) / dashboardData.length
    : 0;
  const avgProcessingTime = dashboardData.length > 0
    ? dashboardData.reduce((sum, item) => sum + item.avg_completion_time_s, 0) / dashboardData.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Přehled požadavků AI</h1>
          <p className="text-muted-foreground mt-1">
            Monitoring a analýza výkonu AI požadavků
          </p>
        </div>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktuální stav požadavků
          </CardTitle>
          <CardDescription>
            Přehled všech typů AI požadavků a jejich metriky
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-6 w-6 animate-spin" />
            </div>
          ) : dashboardData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Žádná data k zobrazení
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
                {dashboardData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {getTypeLabel(item.type)}
                    </TableCell>
                    <TableCell className="text-right">{item.total_requests}</TableCell>
                    <TableCell className="text-right">{item.completed_count}</TableCell>
                    <TableCell className="text-right">{item.error_count}</TableCell>
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
                ))}
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
    </div>
  );
}
