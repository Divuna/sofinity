import React from 'react';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { ProjectSelector } from '@/components/Dashboard/ProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Mail,
  Calendar,
  Sparkles,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';

const recentCampaigns = [
  {
    id: 1,
    name: 'Opravo - Letní promo',
    status: 'active',
    progress: 75,
    engagement: '8.2%',
    reach: '2.4K'
  },
  {
    id: 2,
    name: 'BikeShare24 - Nové lokace',
    status: 'scheduled',
    progress: 100,
    engagement: '12.1%',
    reach: '1.8K'
  },
  {
    id: 3,
    name: 'CoDneska - Víkendové akce',
    status: 'draft',
    progress: 45,
    engagement: '6.8%',
    reach: '956'
  }
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Přehled vašich AI marketingových kampaní
          </p>
        </div>
        <Button variant="gradient" className="shadow-strong">
          <Sparkles className="w-4 h-4 mr-2" />
          Nová kampaň
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktivní kampaně"
          value="12"
          change="+2 tento týden"
          changeType="positive"
          icon={TrendingUp}
          gradient
        />
        <StatsCard
          title="Celkový dosah"
          value="48.2K"
          change="+12.5% vs minulý měsíc"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Engagement"
          value="9.4%"
          change="+0.8% vs minulý měsíc"
          changeType="positive"
          icon={MessageSquare}
        />
        <StatsCard
          title="Email otevření"
          value="24.8%"
          change="-2.1% vs minulý měsíc"
          changeType="negative"
          icon={Mail}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Nedávné kampaně</CardTitle>
              <Button variant="ghost" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Zobrazit vše
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-foreground">{campaign.name}</h3>
                      <Badge 
                        variant={
                          campaign.status === 'active' ? 'default' :
                          campaign.status === 'scheduled' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {campaign.status === 'active' ? 'Aktivní' :
                         campaign.status === 'scheduled' ? 'Naplánováno' : 'Koncept'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {campaign.status === 'active' ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Progress value={campaign.progress} className="mb-3" />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Dosah: {campaign.reach}</span>
                    <span>Engagement: {campaign.engagement}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Project Selector */}
        <div>
          <ProjectSelector />
          
          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Rychlé akce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-3" />
                Naplánovat post
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-3" />
                Poslat email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-3" />
                Nastavit auto-odpověď
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}