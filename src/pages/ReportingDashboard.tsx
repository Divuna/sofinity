import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Users,
  Mail,
  MessageSquare,
  Star,
  DollarSign,
  Target,
  Activity,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

const reportingData = {
  overview: {
    totalRevenue: 280430,
    totalCampaigns: 38,
    avgSatisfaction: 4.6,
    activeProjects: 3,
    monthlyGrowth: 24.8,
    emailOpenRate: 32.4,
    clickThroughRate: 8.7,
    conversionRate: 12.3
  },
  projects: [
    {
      name: 'Opravo',
      revenue: 156780,
      campaigns: 18,
      satisfaction: 4.8,
      growth: 23.5,
      engagement: 12.4,
      trend: 'up'
    },
    {
      name: 'BikeShare24',
      revenue: 89450,
      campaigns: 12,
      satisfaction: 4.6,
      growth: 31.2,
      engagement: 15.7,
      trend: 'up'
    },
    {
      name: 'CoDneska',
      revenue: 34200,
      campaigns: 8,
      satisfaction: 4.3,
      growth: 18.7,
      engagement: 8.9,
      trend: 'stable'
    }
  ],
  monthlyData: [
    { month: 'Leden', revenue: 45000, campaigns: 8, satisfaction: 4.2 },
    { month: 'Únor', revenue: 52000, campaigns: 10, satisfaction: 4.3 },
    { month: 'Březen', revenue: 48000, campaigns: 9, satisfaction: 4.4 },
    { month: 'Duben', revenue: 61000, campaigns: 12, satisfaction: 4.5 },
    { month: 'Květen', revenue: 68000, campaigns: 14, satisfaction: 4.6 },
    { month: 'Červen', revenue: 75000, campaigns: 16, satisfaction: 4.7 },
    { month: 'Červenec', revenue: 89000, campaigns: 18, satisfaction: 4.6 },
    { month: 'Srpen', revenue: 95000, campaigns: 20, satisfaction: 4.8 }
  ],
  topCampaigns: [
    {
      name: 'Opravo - Letní promo 2024',
      project: 'Opravo',
      revenue: 45600,
      engagement: 24.8,
      satisfaction: 4.9,
      status: 'completed'
    },
    {
      name: 'BikeShare24 - Expanze Praha',
      project: 'BikeShare24',
      revenue: 32400,
      engagement: 31.2,
      satisfaction: 4.7,
      status: 'active'
    },
    {
      name: 'Opravo - Video tutoriály',
      project: 'Opravo',
      revenue: 28900,
      engagement: 18.6,
      satisfaction: 4.8,
      status: 'completed'
    }
  ]
};

const timeFilters = [
  { label: 'Posledních 7 dní', value: '7d' },
  { label: 'Posledních 30 dní', value: '30d' },
  { label: 'Posledních 90 dní', value: '90d' },
  { label: 'Tento rok', value: 'year' },
  { label: 'Vlastní rozsah', value: 'custom' }
];

export default function ReportingDashboard() {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('30d');
  const [selectedProject, setSelectedProject] = useState('all');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4 text-success" />;
      case 'down': return <ArrowDownRight className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 min-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Komplexní přehled KPI a výkonnosti všech projektů
          </p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={selectedTimeFilter}
            onChange={(e) => setSelectedTimeFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            {timeFilters.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Obnovit data
          </Button>
          <Button variant="gradient">
            <Download className="w-4 h-4 mr-2" />
            Export reportu
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové tržby</p>
                <p className="text-2xl font-bold text-foreground">
                  {reportingData.overview.totalRevenue.toLocaleString()} Kč
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">+{reportingData.overview.monthlyGrowth}%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-sofinity-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkem kampaní</p>
                <p className="text-2xl font-bold text-foreground">{reportingData.overview.totalCampaigns}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">+18% tento měsíc</span>
                </div>
              </div>
              <MessageSquare className="w-8 h-8 text-sofinity-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. spokojenost</p>
                <p className="text-2xl font-bold text-foreground">{reportingData.overview.avgSatisfaction}/5</p>
                <div className="flex items-center space-x-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">+0.3 pts</span>
                </div>
              </div>
              <Star className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Konverze</p>
                <p className="text-2xl font-bold text-foreground">{reportingData.overview.conversionRate}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <span className="text-xs text-success">+2.1% vs. min. měsíc</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tržby v čase</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtr
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Chart Placeholder */}
              <div className="h-80 flex items-center justify-center bg-surface rounded-lg border-2 border-dashed border-border">
                <div className="text-center">
                  <BarChart2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Graf tržeb v čase</p>
                  <p className="text-sm text-muted-foreground">Data za posledních 8 měsíců</p>
                </div>
              </div>
              
              {/* Monthly Data Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Měsíc</th>
                      <th className="text-right p-2">Tržby (Kč)</th>
                      <th className="text-right p-2">Kampaně</th>
                      <th className="text-right p-2">Spokojenost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportingData.monthlyData.slice(-4).map((month, index) => (
                      <tr key={index} className="border-b border-border hover:bg-surface">
                        <td className="p-2 font-medium">{month.month}</td>
                        <td className="p-2 text-right">{month.revenue.toLocaleString()}</td>
                        <td className="p-2 text-right">{month.campaigns}</td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Star className="w-3 h-3 text-warning fill-warning" />
                            <span>{month.satisfaction}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Performance & Top Campaigns */}
        <div className="space-y-6">
          {/* Project Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Výkonnost projektů</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportingData.projects.map((project, index) => (
                <div key={index} className="p-4 rounded-lg bg-surface border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{project.name}</h4>
                    {getTrendIcon(project.trend)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tržby:</span>
                      <div className="font-medium">{project.revenue.toLocaleString()} Kč</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kampaně:</span>
                      <div className="font-medium">{project.campaigns}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spokojenost:</span>
                      <div className="font-medium flex items-center space-x-1">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span>{project.satisfaction}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Růst:</span>
                      <div className={`font-medium ${getTrendColor(project.trend)}`}>
                        +{project.growth}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Top kampaně</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportingData.topCampaigns.map((campaign, index) => (
                <div key={index} className="p-3 rounded-lg bg-surface border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-foreground line-clamp-1">
                      {campaign.name}
                    </h4>
                    <Badge 
                      variant={campaign.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {campaign.status === 'active' ? 'Aktivní' : 'Dokončeno'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2">
                    {campaign.project}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tržby:</span>
                      <div className="font-medium">{campaign.revenue.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Engagement:</span>
                      <div className="font-medium">{campaign.engagement}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rating:</span>
                      <div className="font-medium flex items-center space-x-1">
                        <Star className="w-2 h-2 text-warning fill-warning" />
                        <span>{campaign.satisfaction}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email výkonnost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open rate</span>
                <span className="font-medium">{reportingData.overview.emailOpenRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Click-through rate</span>
                <span className="font-medium">{reportingData.overview.clickThroughRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversion rate</span>
                <span className="font-medium">{reportingData.overview.conversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Růstové trendy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Měsíční růst</span>
                <span className="font-medium text-success">+{reportingData.overview.monthlyGrowth}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nové kampaně</span>
                <span className="font-medium text-success">+18%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spokojenost</span>
                <span className="font-medium text-success">+6.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktivita týmu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktivní projekty</span>
                <span className="font-medium">{reportingData.overview.activeProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dokončené úkoly</span>
                <span className="font-medium">127</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Průměrná efektivita</span>
                <span className="font-medium">94%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}