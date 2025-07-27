import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  UserPlus,
  Settings,
  Crown,
  Briefcase,
  MessageSquare
} from 'lucide-react';

const teamMembers = [
  {
    id: 1,
    name: 'Tomáš Novák',
    email: 'tomas@sofinity.cz',
    phone: '+420 777 123 456',
    role: 'Admin',
    department: 'Management',
    avatar: 'TN',
    status: 'online',
    joinDate: '2024-01-15',
    lastActive: 'Právě teď',
    projects: ['Sofinity Core', 'Opravo', 'BikeShare24'],
    permissions: ['Všechny projekty', 'Správa uživatelů', 'Systémová nastavení']
  },
  {
    id: 2,
    name: 'Anna Svobodová',
    email: 'anna@sofinity.cz',
    phone: '+420 777 234 567',
    role: 'Marketing',
    department: 'Marketing',
    avatar: 'AS',
    status: 'away',
    joinDate: '2024-02-01',
    lastActive: 'před 2 hodinami',
    projects: ['Opravo', 'BikeShare24', 'CoDneska'],
    permissions: ['Tvorba kampaní', 'Social media', 'Analytics']
  },
  {
    id: 3,
    name: 'Pavel Dvořák',
    email: 'pavel@sofinity.cz',
    phone: '+420 777 345 678',
    role: 'Support',
    department: 'Customer Success',
    avatar: 'PD',
    status: 'offline',
    joinDate: '2024-03-10',
    lastActive: 'včera',
    projects: ['Opravo', 'CoDneska'],
    permissions: ['Zákaznická podpora', 'Auto-odpovědi', 'Uživatelský obsah']
  },
  {
    id: 4,
    name: 'Martina Horáková',
    email: 'martina@sofinity.cz',
    phone: '+420 777 456 789',
    role: 'Marketing',
    department: 'Marketing',
    avatar: 'MH',
    status: 'online',
    joinDate: '2024-04-05',
    lastActive: 'před 30 min',
    projects: ['CoDneska', 'BikeShare24'],
    permissions: ['Community management', 'Content creation', 'Event marketing']
  },
  {
    id: 5,
    name: 'Jan Procházka',
    email: 'jan@sofinity.cz',
    phone: '+420 777 567 890',
    role: 'Marketing',
    department: 'Marketing',
    avatar: 'JP',
    status: 'away',
    joinDate: '2024-05-20',
    lastActive: 'před 4 hodinami',
    projects: ['Opravo'],
    permissions: ['Video produkce', 'Grafický design', 'Brand management']
  }
];

const roleConfig = {
  Admin: { color: 'bg-sofinity-purple', icon: Crown, label: 'Administrátor' },
  Marketing: { color: 'bg-sofinity-orange', icon: Briefcase, label: 'Marketing' },
  Support: { color: 'bg-primary', icon: MessageSquare, label: 'Podpora' }
};

const statusConfig = {
  online: { color: 'bg-success', label: 'Online' },
  away: { color: 'bg-warning', label: 'Pryč' },
  offline: { color: 'bg-muted-foreground', label: 'Offline' }
};

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(teamMembers[0]);
  
  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Správa uživatelů</h1>
          <p className="text-muted-foreground mt-1">
            Správa týmu a oprávnění v Sofinity platformě
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Oprávnění
          </Button>
          <Button variant="gradient">
            <UserPlus className="w-4 h-4 mr-2" />
            Pozvat uživatele
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          {/* Search & Filters */}
          <div className="flex space-x-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat uživatele..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtry
            </Button>
          </div>

          {/* Users Grid */}
          <div className="grid gap-4">
            {filteredMembers.map((member) => {
              const roleConfig_ = roleConfig[member.role as keyof typeof roleConfig];
              const statusConfig_ = statusConfig[member.status as keyof typeof statusConfig];
              const RoleIcon = roleConfig_.icon;
              
              return (
                <Card 
                  key={member.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                    selectedUser.id === member.id ? 'border-primary shadow-soft' : ''
                  }`}
                  onClick={() => setSelectedUser(member)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-primary text-white font-medium">
                              {member.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusConfig_.color}`} />
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-foreground">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`${roleConfig_.color} text-white text-xs`}>
                              {roleConfig_.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {member.department}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {member.lastActive}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.projects.length} projektů
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* User Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {selectedUser.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{selectedUser.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.role}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Kontaktní údaje</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedUser.phone}</span>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Projekty</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.projects.map((project) => (
                    <Badge key={project} variant="outline" className="text-xs">
                      {project}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Oprávnění</h4>
                <div className="space-y-2">
                  {selectedUser.permissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Shield className="w-3 h-3 text-success" />
                      <span className="text-sm text-foreground">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Info */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stav</span>
                    <Badge className={`${statusConfig[selectedUser.status as keyof typeof statusConfig].color} text-white text-xs`}>
                      {statusConfig[selectedUser.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Naposledy aktivní</span>
                    <span className="text-foreground">{selectedUser.lastActive}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Člen od</span>
                    <span className="text-foreground">{new Date(selectedUser.joinDate).toLocaleDateString('cs-CZ')}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Upravit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Oprávnění
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Statistiky týmu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Celkem členů</span>
                <span className="font-medium">{teamMembers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Online</span>
                <span className="font-medium text-success">
                  {teamMembers.filter(m => m.status === 'online').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Administrátoři</span>
                <span className="font-medium">
                  {teamMembers.filter(m => m.role === 'Admin').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aktivní projekty</span>
                <span className="font-medium">3</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}