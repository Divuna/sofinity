import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';

const calendarEvents = [
  {
    id: 1,
    title: 'Opravo - Instagram Stories',
    description: 'Serie 5 stories o mobilních opravách',
    date: '2024-08-15',
    time: '09:00',
    project: 'Opravo',
    assignedTo: [
      { name: 'Anna Svobodová', avatar: 'AS' },
      { name: 'Pavel Dvořák', avatar: 'PD' }
    ],
    type: 'content',
    status: 'pending',
    priority: 'high'
  },
  {
    id: 2,
    title: 'BikeShare24 - Email kampaň',
    description: 'Newsletter o nových lokacích',
    date: '2024-08-15',
    time: '14:30',
    project: 'BikeShare24',
    assignedTo: [
      { name: 'Tomáš Novák', avatar: 'TN' }
    ],
    type: 'email',
    status: 'completed',
    priority: 'medium'
  },
  {
    id: 3,
    title: 'CoDneska - Facebook post',
    description: 'Víkendové akce v Praze',
    date: '2024-08-16',
    time: '10:15',
    project: 'CoDneska',
    assignedTo: [
      { name: 'Martina Horáková', avatar: 'MH' },
      { name: 'Anna Svobodová', avatar: 'AS' }
    ],
    type: 'social',
    status: 'pending',
    priority: 'low'
  },
  {
    id: 4,
    title: 'Opravo - YouTube video',
    description: 'Tutoriál pro rychlé opravy',
    date: '2024-08-17',
    time: '16:00',
    project: 'Opravo',
    assignedTo: [
      { name: 'Pavel Dvořák', avatar: 'PD' }
    ],
    type: 'video',
    status: 'pending',
    priority: 'high'
  },
  {
    id: 5,
    title: 'BikeShare24 - Push notifikace',
    description: 'Upozornění na nové stanoviště',
    date: '2024-08-18',
    time: '08:00',
    project: 'BikeShare24',
    assignedTo: [
      { name: 'Tomáš Novák', avatar: 'TN' },
      { name: 'Anna Svobodová', avatar: 'AS' }
    ],
    type: 'push',
    status: 'pending',
    priority: 'medium'
  }
];

const typeConfig = {
  content: { color: 'bg-sofinity-purple', label: 'Obsah' },
  email: { color: 'bg-sofinity-orange', label: 'Email' },
  social: { color: 'bg-primary', label: 'Sociální sítě' },
  video: { color: 'bg-secondary', label: 'Video' },
  push: { color: 'bg-success', label: 'Push' }
};

const priorityConfig = {
  high: { color: 'text-destructive', label: 'Vysoká' },
  medium: { color: 'text-warning', label: 'Střední' },
  low: { color: 'text-muted-foreground', label: 'Nízká' }
};

export default function TeamCalendar() {
  const [selectedDate, setSelectedDate] = useState('2024-08-15');
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');

  const getEventsForDate = (date: string) => {
    return calendarEvents.filter(event => event.date === date);
  };

  const currentWeek = [
    '2024-08-12', '2024-08-13', '2024-08-14', 
    '2024-08-15', '2024-08-16', '2024-08-17', '2024-08-18'
  ];

  const getDayName = (date: string) => {
    const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    return days[new Date(date).getDay()];
  };

  const getDateNumber = (date: string) => {
    return new Date(date).getDate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kalendář týmu</h1>
          <p className="text-muted-foreground mt-1">
            Plánování a koordinace marketingových aktivit
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtry
          </Button>
          <Button variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Nová událost
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">Srpen 2024</h2>
              <Button variant="ghost" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant={view === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setView('day')}
              >
                Den
              </Button>
              <Button 
                variant={view === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setView('week')}
              >
                Týden
              </Button>
              <Button 
                variant={view === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setView('month')}
              >
                Měsíc
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Week View */}
          {view === 'week' && (
            <div className="grid grid-cols-7 min-h-[500px]">
              {currentWeek.map((date) => (
                <div 
                  key={date}
                  className={`border-r border-border p-3 ${
                    date === selectedDate ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs text-muted-foreground">{getDayName(date)}</div>
                    <div className={`text-lg font-semibold ${
                      date === selectedDate ? 'text-primary' : 'text-foreground'
                    }`}>
                      {getDateNumber(date)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {getEventsForDate(date).map((event) => {
                      const typeConfig_ = typeConfig[event.type as keyof typeof typeConfig];
                      
                      return (
                        <div
                          key={event.id}
                          className="p-2 rounded-lg border border-border bg-surface hover:shadow-soft cursor-pointer transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={`${typeConfig_.color} text-white text-xs`}>
                              {typeConfig_.label}
                            </Badge>
                            {event.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3 text-success" />
                            ) : (
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="text-xs font-medium text-foreground mb-1">
                            {event.time}
                          </div>
                          
                          <div className="text-xs text-foreground font-medium mb-1 line-clamp-2">
                            {event.title}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {event.project}
                            </Badge>
                            
                            <div className="flex -space-x-1">
                              {event.assignedTo.slice(0, 2).map((person, index) => (
                                <Avatar key={index} className="w-5 h-5 border border-background">
                                  <AvatarFallback className="text-xs bg-gradient-primary text-white">
                                    {person.avatar}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {event.assignedTo.length > 2 && (
                                <div className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center text-muted-foreground border border-background">
                                  +{event.assignedTo.length - 2}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Events */}
      <Card>
        <CardHeader>
          <CardTitle>Dnešní události</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getEventsForDate(selectedDate).map((event) => {
              const typeConfig_ = typeConfig[event.type as keyof typeof typeConfig];
              const priorityConfig_ = priorityConfig[event.priority as keyof typeof priorityConfig];
              
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:shadow-soft transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${typeConfig_.color}`} />
                    
                    <div>
                      <div className="font-medium text-foreground">{event.title}</div>
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                        <Badge variant="outline" className="text-xs">{event.project}</Badge>
                        <span className={`text-xs ${priorityConfig_.color}`}>
                          {priorityConfig_.label} priorita
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-1">
                      {event.assignedTo.map((person, index) => (
                        <Avatar key={index} className="w-8 h-8 border-2 border-background">
                          <AvatarFallback className="text-sm bg-gradient-primary text-white">
                            {person.avatar}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    
                    <div className="flex space-x-1">
                      {event.status === 'completed' ? (
                        <Badge variant="default" className="text-xs bg-success">
                          Hotovo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Čekající
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}