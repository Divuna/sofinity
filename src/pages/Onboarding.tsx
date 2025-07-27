import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Play, Users, BookOpen, Settings, Zap } from 'lucide-react';

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
  
  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered onboarding pro nové členy týmu
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Pozvat kolegy
          </Button>
          <Button variant="gradient">
            <Zap className="w-4 h-4 mr-2" />
            Přizpůsobit onboarding
          </Button>
        </div>
      </div>

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

        {/* Team Progress */}
        <div>
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

          {/* Quick Resources */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Rychlé zdroje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-sm">
                <BookOpen className="w-4 h-4 mr-3" />
                Dokumentace
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Play className="w-4 h-4 mr-3" />
                Video tutoriály
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Settings className="w-4 h-4 mr-3" />
                Základní nastavení
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}