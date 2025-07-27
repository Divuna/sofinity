import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Bike, 
  Smartphone, 
  Calendar,
  Users,
  TrendingUp,
  Mail,
  MessageSquare,
  BarChart3,
  Settings,
  Star,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

const projects = [
  {
    id: 'opravo',
    name: 'Opravo',
    description: 'Mobilní opravy a servis',
    icon: Smartphone,
    color: 'bg-sofinity-purple',
    status: 'active',
    campaigns: {
      active: 4,
      total: 18,
      thisMonth: 6
    },
    metrics: {
      revenue: 156780,
      engagement: 12.4,
      satisfaction: 4.8,
      growth: 23.5
    },
    lastUpdate: '2024-08-15T14:30:00',
    team: ['Tomáš Novák', 'Anna Svobodová', 'Pavel Dvořák'],
    recentActivity: [
      { type: 'campaign', message: 'Nová kampaň "Video tutoriály" spuštěna', time: '2 hodiny' },
      { type: 'feedback', message: 'Pozitivní zpětná vazba od zákazníka', time: '5 hodin' },
      { type: 'invoice', message: 'Faktura INV-2024-004 po splatnosti', time: '1 den' }
    ]
  },
  {
    id: 'bikeshare24',
    name: 'BikeShare24',
    description: 'Sdílení kol a mikromobilita',
    icon: Bike,
    color: 'bg-sofinity-orange',
    status: 'active',
    campaigns: {
      active: 3,
      total: 12,
      thisMonth: 4
    },
    metrics: {
      revenue: 89450,
      engagement: 15.7,
      satisfaction: 4.6,
      growth: 31.2
    },
    lastUpdate: '2024-08-15T16:15:00',
    team: ['Tomáš Novák', 'Martina Horáková'],
    recentActivity: [
      { type: 'campaign', message: 'Expanze Praha kampaň dokončena', time: '4 hodiny' },
      { type: 'analytics', message: 'Měsíční report vygenerován', time: '1 den' },
      { type: 'partner', message: 'Nový pojišťovací partner přidán', time: '2 dny' }
    ]
  },
  {
    id: 'codneska',
    name: 'CoDneska',
    description: 'Události a komunitní aktivity',
    icon: Calendar,
    color: 'bg-primary',
    status: 'active',
    campaigns: {
      active: 2,
      total: 8,
      thisMonth: 3
    },
    metrics: {
      revenue: 34200,
      engagement: 8.9,
      satisfaction: 4.3,
      growth: 18.7
    },
    lastUpdate: '2024-08-15T12:45:00',
    team: ['Martina Horáková', 'Anna Svobodová'],
    recentActivity: [
      { type: 'event', message: 'Víkendové akce kampaň naplánována', time: '6 hodin' },
      { type: 'feedback', message: 'Žádost o novou lokaci "Karlín"', time: '1 den' },
      { type: 'content', message: 'Community building obsah vytvořen', time: '3 dny' }
    ]
  }
];

const activityTypeConfig = {
  campaign: { icon: MessageSquare, color: 'text-sofinity-purple' },
  feedback: { icon: Star, color: 'text-sofinity-orange' },
  invoice: { icon: AlertTriangle, color: 'text-destructive' },
  analytics: { icon: BarChart3, color: 'text-primary' },
  partner: { icon: Building2, color: 'text-success' },
  event: { icon: Calendar, color: 'text-sofinity-purple' },
  content: { icon: MessageSquare, color: 'text-muted-foreground' }
};

export default function ProjectSwitcher() {
  const [selectedProject, setSelectedProject] = useState(projects[0]);

  const totalRevenue = projects.reduce((sum, p) => sum + p.metrics.revenue, 0);
  const totalCampaigns = projects.reduce((sum, p) => sum + p.campaigns.active, 0);
  const avgSatisfaction = projects.reduce((sum, p) => sum + p.metrics.satisfaction, 0) / projects.length;

  return (
    <div className="space-y-6 min-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Správa projektů</h1>
          <p className="text-muted-foreground mt-1">
            Přepínání mezi projekty a přehled všech aktivit
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Nastavení projektů
          </Button>
          <Button variant="gradient">
            <Building2 className="w-4 h-4 mr-2" />
            Nový projekt
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové tržby</p>
                <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()} Kč</p>
              </div>
              <TrendingUp className="w-8 h-8 text-sofinity-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktivní kampaně</p>
                <p className="text-2xl font-bold text-foreground">{totalCampaigns}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-sofinity-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Průměrná spokojenost</p>
                <p className="text-2xl font-bold text-foreground">{avgSatisfaction.toFixed(1)}/5</p>
              </div>
              <Star className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktivní projekty</p>
                <p className="text-2xl font-bold text-foreground">{projects.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Grid */}
        <div className="lg:col-span-2">
          <div className="grid gap-6">
            {projects.map((project) => {
              const Icon = project.icon;
              const isSelected = selectedProject.id === project.id;
              
              return (
                <Card 
                  key={project.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                    isSelected ? 'border-primary shadow-soft ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-3 rounded-lg ${project.color} text-white`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-semibold text-foreground">{project.name}</h3>
                            <Badge className={`${project.color} text-white`}>
                              {project.status === 'active' ? 'Aktivní' : 'Neaktivní'}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-4">{project.description}</p>
                          
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 rounded-lg bg-surface">
                              <div className="text-lg font-bold text-foreground">{project.campaigns.active}</div>
                              <div className="text-xs text-muted-foreground">Aktivní kampaně</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-surface">
                              <div className="text-lg font-bold text-foreground">{project.metrics.revenue.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">Tržby (Kč)</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-surface">
                              <div className="text-lg font-bold text-foreground">{project.metrics.engagement}%</div>
                              <div className="text-xs text-muted-foreground">Engagement</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-surface">
                              <div className="text-lg font-bold text-foreground">+{project.metrics.growth}%</div>
                              <div className="text-xs text-muted-foreground">Růst</div>
                            </div>
                          </div>
                          
                          {/* Team */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Tým: {project.team.join(', ')}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Project Details */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${selectedProject.color} text-white`}>
                  <selectedProject.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>{selectedProject.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Přehled kampaní</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aktivní kampaně</span>
                    <span className="font-medium">{selectedProject.campaigns.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Celkem kampaní</span>
                    <span className="font-medium">{selectedProject.campaigns.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tento měsíc</span>
                    <span className="font-medium">{selectedProject.campaigns.thisMonth}</span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Výkonnost</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Spokojenost</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-medium">{selectedProject.metrics.satisfaction}/5</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engagement rate</span>
                    <span className="font-medium">{selectedProject.metrics.engagement}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Růst (měsíční)</span>
                    <span className="font-medium text-success">+{selectedProject.metrics.growth}%</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium text-foreground mb-3">Nedávná aktivita</h4>
                <div className="space-y-3">
                  {selectedProject.recentActivity.map((activity, index) => {
                    const config = activityTypeConfig[activity.type as keyof typeof activityTypeConfig];
                    const ActivityIcon = config.icon;
                    
                    return (
                      <div key={index} className="flex items-start space-x-3 p-2 rounded-lg bg-surface">
                        <ActivityIcon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">před {activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button variant="gradient" size="sm" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Otevřít projekt
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}