import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  FileText, 
  Mail,
  Users,
  MousePointer,
  Eye,
  Share2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target
} from 'lucide-react';

const campaignReports = [
  {
    id: 1,
    name: 'Opravo - Letní promo 2024',
    period: '1.7. - 31.7.2024',
    status: 'completed',
    channels: ['Email', 'Instagram', 'Facebook'],
    metrics: {
      sent: 2450,
      delivered: 2389,
      opened: 596,
      clicked: 119,
      conversions: 23,
      openRate: 24.9,
      clickRate: 20.0,
      conversionRate: 19.3,
      revenue: 45600
    },
    trend: 'positive',
    aiInsights: [
      'Nejvyšší engagement ve čtvrtek mezi 18-20h',
      'Mobilní uživatelé měli o 35% vyšší konverzi',
      'Subject linky s čísly měly o 12% vyšší otevírací míru'
    ]
  },
  {
    id: 2,
    name: 'BikeShare24 - Nové lokace',
    period: '15.7. - 15.8.2024',
    status: 'active',
    channels: ['Email', 'YouTube', 'LinkedIn'],
    metrics: {
      sent: 1890,
      delivered: 1845,
      opened: 387,
      clicked: 58,
      conversions: 12,
      openRate: 21.0,
      clickRate: 15.0,
      conversionRate: 20.7,
      revenue: 18900
    },
    trend: 'neutral',
    aiInsights: [
      'LinkedIn posty mají 3x vyšší dosah než očekáváno',
      'Video obsah generuje 45% více kliků',
      'Víkendové posty mají nižší engagement'
    ]
  },
  {
    id: 3,
    name: 'CoDneska - Víkendové akce',
    period: '1.8. - 31.8.2024',
    status: 'draft',
    channels: ['Instagram', 'Facebook', 'Push'],
    metrics: {
      sent: 3200,
      delivered: 3156,
      opened: 474,
      clicked: 76,
      conversions: 8,
      openRate: 15.0,
      clickRate: 16.0,
      conversionRate: 10.5,
      revenue: 8400
    },
    trend: 'negative',
    aiInsights: [
      'Push notifikace mají nejnižší engagement',
      'Potřeba optimalizace cílení pro víkendy',
      'Stories formát převyšuje běžné posty o 25%'
    ]
  }
];

export default function CampaignReports() {
  const [selectedReport, setSelectedReport] = useState(campaignReports[0]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive': return <ArrowUpRight className="w-4 h-4 text-success" />;
      case 'negative': return <ArrowDownRight className="w-4 h-4 text-destructive" />;
      default: return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'positive': return 'text-success';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporty kampaní</h1>
          <p className="text-muted-foreground mt-1">
            Detailní analýzy výkonu s AI doporučeními
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="gradient">
            <Brain className="w-4 h-4 mr-2" />
            AI analýza
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kampaně</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campaignReports.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                    selectedReport.id === campaign.id
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-border hover:border-primary/50 hover:bg-surface'
                  }`}
                  onClick={() => setSelectedReport(campaign)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant={
                        campaign.status === 'completed' ? 'default' :
                        campaign.status === 'active' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {campaign.status === 'completed' ? 'Dokončeno' :
                       campaign.status === 'active' ? 'Aktivní' : 'Koncept'}
                    </Badge>
                    {getTrendIcon(campaign.trend)}
                  </div>
                  <h3 className="font-medium text-sm text-foreground mb-1">{campaign.name}</h3>
                  <p className="text-xs text-muted-foreground">{campaign.period}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {campaign.channels.slice(0, 2).map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                    {campaign.channels.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{campaign.channels.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Report Details */}
        <div className="lg:col-span-3">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Odesláno</p>
                    <p className="text-xl font-bold">{selectedReport.metrics.sent.toLocaleString()}</p>
                  </div>
                  <Mail className="w-8 h-8 text-sofinity-purple" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Otevřeno</p>
                    <p className="text-xl font-bold">{selectedReport.metrics.openRate}%</p>
                  </div>
                  <Eye className="w-8 h-8 text-sofinity-orange" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Kliknuto</p>
                    <p className="text-xl font-bold">{selectedReport.metrics.clickRate}%</p>
                  </div>
                  <MousePointer className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Konverze</p>
                    <p className="text-xl font-bold">{selectedReport.metrics.conversionRate}%</p>
                  </div>
                  <Target className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Report */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedReport.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{selectedReport.period}</span>
                  {getTrendIcon(selectedReport.trend)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Funnel */}
                <div>
                  <h3 className="font-semibold mb-4">Výkonnostní trychtýř</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Doručeno</span>
                        <span>{selectedReport.metrics.delivered} / {selectedReport.metrics.sent}</span>
                      </div>
                      <Progress value={(selectedReport.metrics.delivered / selectedReport.metrics.sent) * 100} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Otevřeno</span>
                        <span>{selectedReport.metrics.opened} / {selectedReport.metrics.delivered}</span>
                      </div>
                      <Progress value={selectedReport.metrics.openRate} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Kliknuto</span>
                        <span>{selectedReport.metrics.clicked} / {selectedReport.metrics.opened}</span>
                      </div>
                      <Progress value={selectedReport.metrics.clickRate} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Konvertováno</span>
                        <span>{selectedReport.metrics.conversions} / {selectedReport.metrics.clicked}</span>
                      </div>
                      <Progress value={selectedReport.metrics.conversionRate} />
                    </div>
                  </div>
                </div>

                {/* Revenue & ROI */}
                <div>
                  <h3 className="font-semibold mb-4">Finanční výsledky</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-surface border border-border">
                      <div className="text-2xl font-bold text-foreground">
                        {selectedReport.metrics.revenue.toLocaleString()} Kč
                      </div>
                      <div className="text-sm text-muted-foreground">Celkový příjem</div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-surface border border-border">
                      <div className="text-2xl font-bold text-success">
                        {Math.round(selectedReport.metrics.revenue / selectedReport.metrics.conversions).toLocaleString()} Kč
                      </div>
                      <div className="text-sm text-muted-foreground">Příjem na konverzi</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2 text-sofinity-purple" />
                AI Doporučení
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedReport.aiInsights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-surface border border-border">
                    <div className="w-2 h-2 rounded-full bg-gradient-primary mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground">{insight}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button variant="gradient" size="sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Generovat detailní analýzu
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Export reportu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}