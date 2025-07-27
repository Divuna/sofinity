import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Users, 
  BookOpen, 
  Settings, 
  Zap, 
  Bot,
  MessageSquare,
  Sparkles,
  GraduationCap,
  Target,
  ArrowRight
} from 'lucide-react';

const onboardingSteps = [
  {
    id: 1,
    title: 'Vítejte v Sofinity',
    description: 'Seznamte se se základy AI marketingové platformy',
    type: 'intro',
    completed: true,
    estimatedTime: '5 min'
  },
  {
    id: 2,
    title: 'Nastavení prvního projektu',
    description: 'Připojte si Opravo, BikeShare24 nebo CoDneska',
    type: 'setup',
    completed: true,
    estimatedTime: '10 min'
  },
  {
    id: 3,
    title: 'Vytvoření první AI kampaně',
    description: 'Naučte se používat AI generátor pro vytváření kampaní',
    type: 'hands-on',
    completed: false,
    current: true,
    estimatedTime: '15 min'
  },
  {
    id: 4,
    title: 'Automatizace emailů',
    description: 'Nastavte auto-odpovědi a emailové sekvence',
    type: 'automation',
    completed: false,
    estimatedTime: '12 min'
  },
  {
    id: 5,
    title: 'Analytics a reporty',
    description: 'Sledujte výkon kampaní a generujte reporty',
    type: 'analytics',
    completed: false,
    estimatedTime: '8 min'
  },
  {
    id: 6,
    title: 'Týmová spolupráce',
    description: 'Pozvěte kolegy a nastavte role',
    type: 'collaboration',
    completed: false,
    estimatedTime: '10 min'
  }
];

const teamMembers = [
  {
    id: 1,
    name: 'Tomáš Novák',
    email: 'tomas@sofinity.cz',
    role: 'Admin',
    progress: 100,
    lastActive: 'online',
    avatar: 'TN'
  },
  {
    id: 2,
    name: 'Anna Svobodová',
    email: 'anna@sofinity.cz',
    role: 'Marketing',
    progress: 67,
    lastActive: 'před 2 hodinami',
    avatar: 'AS'
  },
  {
    id: 3,
    name: 'Pavel Dvořák',
    email: 'pavel@sofinity.cz',
    role: 'Support',
    progress: 33,
    lastActive: 'včera',
    avatar: 'PD'
  }
];

export default function Onboarding() {
  const [selectedStep, setSelectedStep] = useState(3);
  const [activeTab, setActiveTab] = useState('overview');
  
  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  const handleStartAIChat = () => {
    // Navigate to AI Assistant
    window.location.href = '/ai-assistant';
  };

  const handleOpenKnowledge = () => {
    // Navigate to Knowledge Base
    window.location.href = '/knowledge-base';
  };

  const handleStartWizard = () => {
    // Navigate to Setup Wizard
    window.location.href = '/setup-wizard';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Onboarding centrum</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered onboarding s interaktivním průvodcem a znalostní bází
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleStartAIChat}>
            <Bot className="w-4 h-4 mr-2" />
            AI Asistent
          </Button>
          <Button variant="gradient" onClick={handleOpenKnowledge}>
            <BookOpen className="w-4 h-4 mr-2" />
            Znalostní centrum
          </Button>
        </div>
      </div>

      {/* AI Welcome Banner */}
      <Card className="bg-gradient-card border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Vítejte v Sofinity! 👋
                </h3>
                <p className="text-muted-foreground">
                  Jsem váš AI asistent a pomohu vám s prvními kroky. Můžete se mě zeptat na cokoliv!
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={handleStartWizard}>
                <Settings className="w-4 h-4 mr-2" />
                Setup Wizard
              </Button>
              <Button variant="gradient" onClick={handleStartAIChat}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Začít chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Přehled
          </TabsTrigger>
          <TabsTrigger value="ai-guide" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Průvodce
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Vzdelávání
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tým
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Váš pokrok</span>
                  <Badge variant="secondary">{completedSteps}/{totalSteps} kroků</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={overallProgress} className="mb-3" />
                <p className="text-sm text-muted-foreground">
                  Dokončeno {Math.round(overallProgress)}% onboardingu
                </p>
              </CardContent>
            </Card>

            {/* Onboarding Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding kroky</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {onboardingSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                      selectedStep === step.id
                        ? 'border-primary bg-primary/5 shadow-soft'
                        : step.completed
                        ? 'border-success/30 bg-success/5'
                        : 'border-border hover:border-primary/50 hover:bg-surface'
                    }`}
                    onClick={() => setSelectedStep(step.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : step.current ? (
                          <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{step.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {step.estimatedTime}
                            </Badge>
                            {step.current && (
                              <Button size="sm" variant="gradient">
                                <Play className="w-3 h-3 mr-1" />
                                Pokračovat
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Rychlé akce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleStartWizard}>
                  <Zap className="w-4 h-4 mr-3" />
                  První nastavení
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleStartAIChat}>
                  <Bot className="w-4 h-4 mr-3" />
                  Chat s AI
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm" onClick={handleOpenKnowledge}>
                  <BookOpen className="w-4 h-4 mr-3" />
                  Znalostní báze
                </Button>
              </CardContent>
            </Card>

            {/* Team Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pokrok týmu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg border border-border bg-surface-variant"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center text-sm font-medium">
                          {member.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    
                    <Progress value={member.progress} className="mb-2" />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{member.progress}% dokončeno</span>
                      <span className={member.lastActive === 'online' ? 'text-success' : ''}>
                        {member.lastActive}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>

        {/* AI Guide Tab */}
        <TabsContent value="ai-guide" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-primary" />
                  AI Asistent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Inteligentní průvodce, který vám pomůže s každým krokem platformy.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Odpovědi na otázky v reálném čase
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Personalizované doporučení
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Průvodce funkcemi podle role
                  </div>
                </div>
                <Button className="w-full" variant="gradient" onClick={handleStartAIChat}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Začít rozhovor
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-primary" />
                  Setup Wizard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Krok za krokem průvodce prvotním nastavením platformy.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Připojení externích služeb
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Volba primárního projektu
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-success" />
                    Týmové nastavení
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={handleStartWizard}>
                  <Zap className="w-4 h-4 mr-2" />
                  Spustit průvodce
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Common Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Časté otázky při onboardingu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  q: "Jak vytvořím první kampaň?",
                  a: "Použijte AI asistenta nebo přejděte do sekce 'Nová kampaň' v navigaci."
                },
                {
                  q: "Jak přidám členy týmu?",
                  a: "V sekci 'Správa uživatelů' můžete pozvat nové uživatele emailem."
                },
                {
                  q: "Kde najdu reporty?",
                  a: "Analytics a reporty najdete v 'Reporting Dashboard' a 'Export centru'."
                }
              ].map((faq, index) => (
                <div key={index} className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📚 Dokumentace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Začínáme se Sofinity
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  AI kampaně návod
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Email automatizace
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Analytics průvodce
                </Button>
                <Button className="w-full mt-4" variant="gradient" onClick={handleOpenKnowledge}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Všechna dokumentace
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎥 Video návody</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video bg-gradient-card rounded-lg flex items-center justify-center mb-3">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-medium">Úvod do Sofinity</h4>
                <p className="text-sm text-muted-foreground">12 minut</p>
                <Button size="sm" variant="outline" className="w-full">
                  Přehrát video
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Kampaně:</strong> Začněte s malými testy
                  </div>
                  <div className="text-sm">
                    <strong>Emailing:</strong> Segmentujte své kontakty
                  </div>
                  <div className="text-sm">
                    <strong>Analytics:</strong> Sledujte klíčové metriky
                  </div>
                  <div className="text-sm">
                    <strong>Tým:</strong> Nastavte jasné role
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  Více tipů
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pokrok týmu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center text-sm font-medium">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{member.progress}%</div>
                      <div className="text-xs text-muted-foreground">{member.lastActive}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Týmové akce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-3" />
                  Pozvat nového člena
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-3" />
                  Nastavit role
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-3" />
                  Týmový feedback
                </Button>
                <Button variant="gradient" className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Přizpůsobit onboarding
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}