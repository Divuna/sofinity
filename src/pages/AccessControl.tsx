import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Shield,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Crown,
  Briefcase,
  HeadphonesIcon,
  Eye,
  Lock,
  Unlock,
  Settings,
  UserPlus,
  AlertTriangle,
  Building2
} from 'lucide-react';

const users = [
  {
    id: 1,
    name: 'Tomáš Novák',
    email: 'tomas@sofinity.cz',
    avatar: 'TN',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-08-15T16:30:00',
    projects: ['Opravo', 'BikeShare24', 'CoDneska'],
    permissions: {
      campaigns: { read: true, write: true, delete: true },
      analytics: { read: true, write: true, delete: false },
      invoices: { read: true, write: true, delete: true },
      partners: { read: true, write: true, delete: true },
      users: { read: true, write: true, delete: true },
      exports: { read: true, write: true, delete: false }
    },
    createdAt: '2024-01-15T09:00:00'
  },
  {
    id: 2,
    name: 'Anna Svobodová',
    email: 'anna@sofinity.cz',
    avatar: 'AS',
    role: 'marketing',
    status: 'active',
    lastLogin: '2024-08-15T14:20:00',
    projects: ['Opravo', 'BikeShare24'],
    permissions: {
      campaigns: { read: true, write: true, delete: false },
      analytics: { read: true, write: false, delete: false },
      invoices: { read: true, write: false, delete: false },
      partners: { read: true, write: false, delete: false },
      users: { read: false, write: false, delete: false },
      exports: { read: true, write: false, delete: false }
    },
    createdAt: '2024-02-01T10:30:00'
  },
  {
    id: 3,
    name: 'Pavel Dvořák',
    email: 'pavel@sofinity.cz',
    avatar: 'PD',
    role: 'support',
    status: 'active',
    lastLogin: '2024-08-14T18:45:00',
    projects: ['Opravo', 'CoDneska'],
    permissions: {
      campaigns: { read: true, write: false, delete: false },
      analytics: { read: true, write: false, delete: false },
      invoices: { read: false, write: false, delete: false },
      partners: { read: true, write: false, delete: false },
      users: { read: false, write: false, delete: false },
      exports: { read: false, write: false, delete: false }
    },
    createdAt: '2024-03-10T08:15:00'
  },
  {
    id: 4,
    name: 'Martina Horáková',
    email: 'martina@sofinity.cz',
    avatar: 'MH',
    role: 'marketing',
    status: 'active',
    lastLogin: '2024-08-15T12:10:00',
    projects: ['BikeShare24', 'CoDneska'],
    permissions: {
      campaigns: { read: true, write: true, delete: false },
      analytics: { read: true, write: false, delete: false },
      invoices: { read: true, write: false, delete: false },
      partners: { read: true, write: false, delete: false },
      users: { read: false, write: false, delete: false },
      exports: { read: true, write: false, delete: false }
    },
    createdAt: '2024-04-05T11:45:00'
  },
  {
    id: 5,
    name: 'Jana Manažerka',
    email: 'jana.manager@sofinity.cz',
    avatar: 'JM',
    role: 'management',
    status: 'active',
    lastLogin: '2024-08-15T09:30:00',
    projects: ['Opravo', 'BikeShare24', 'CoDneska'],
    permissions: {
      campaigns: { read: true, write: false, delete: false },
      analytics: { read: true, write: false, delete: false },
      invoices: { read: true, write: false, delete: false },
      partners: { read: true, write: false, delete: false },
      users: { read: true, write: false, delete: false },
      exports: { read: true, write: true, delete: false }
    },
    createdAt: '2024-01-20T14:00:00'
  }
];

const roles = [
  {
    id: 'admin',
    name: 'Administrátor',
    description: 'Plný přístup ke všem funkcím a nastavením',
    icon: Crown,
    color: 'bg-sofinity-purple',
    userCount: 1,
    permissions: ['Všechny funkce', 'Správa uživatelů', 'Systémová nastavení']
  },
  {
    id: 'marketing',
    name: 'Marketing Specialist',
    description: 'Tvorba a správa marketingových kampaní',
    icon: Briefcase,
    color: 'bg-sofinity-orange',
    userCount: 2,
    permissions: ['Tvorba kampaní', 'Analytics (čtení)', 'Social media']
  },
  {
    id: 'support',
    name: 'Zákaznická podpora',
    description: 'Správa ticketů a komunikace se zákazníky',
    icon: HeadphonesIcon,
    color: 'bg-primary',
    userCount: 1,
    permissions: ['Ticketing systém', 'FAQ správa', 'Zákaznická komunikace']
  },
  {
    id: 'management',
    name: 'Management',
    description: 'Přístup k reportům a přehledům (pouze čtení)',
    icon: Building2,
    color: 'bg-success',
    userCount: 1,
    permissions: ['Reporting (čtení)', 'Analytics (čtení)', 'Export dat']
  }
];

const statusConfig = {
  active: { color: 'bg-success', label: 'Aktivní', icon: CheckCircle },
  inactive: { color: 'bg-muted-foreground', label: 'Neaktivní', icon: XCircle },
  suspended: { color: 'bg-destructive', label: 'Pozastavený', icon: AlertTriangle }
};

export default function AccessControl() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissionIcon = (permission: { read: boolean; write: boolean; delete: boolean }) => {
    if (permission.delete) return <Crown className="w-4 h-4 text-sofinity-purple" />;
    if (permission.write) return <Edit className="w-4 h-4 text-sofinity-orange" />;
    if (permission.read) return <Eye className="w-4 h-4 text-primary" />;
    return <Lock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 min-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Správa přístupů</h1>
          <p className="text-muted-foreground mt-1">
            Správa uživatelů, rolí a oprávnění v systému
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Nastavení bezpečnosti
          </Button>
          <Button variant="gradient">
            <UserPlus className="w-4 h-4 mr-2" />
            Pozvat uživatele
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('users')}
          className="rounded-md"
        >
          <Users className="w-4 h-4 mr-2" />
          Uživatelé
        </Button>
        <Button
          variant={activeTab === 'roles' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('roles')}
          className="rounded-md"
        >
          <Shield className="w-4 h-4 mr-2" />
          Role
        </Button>
        <Button
          variant={activeTab === 'permissions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('permissions')}
          className="rounded-md"
        >
          <Lock className="w-4 h-4 mr-2" />
          Oprávnění
        </Button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat uživatele..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Grid */}
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const statusConfig_ = statusConfig[user.status as keyof typeof statusConfig];
                const roleConfig = roles.find(r => r.id === user.role);
                const RoleIcon = roleConfig?.icon || Users;
                
                return (
                  <Card 
                    key={user.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-medium ${
                      selectedUser.id === user.id ? 'border-primary shadow-soft' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-primary text-white font-medium">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusConfig_.color}`} />
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-foreground">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={`${roleConfig?.color || 'bg-muted'} text-white text-xs`}>
                                {roleConfig?.name || user.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {user.projects.length} projektů
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center space-x-1 mb-1">
                            <statusConfig_.icon className={`w-4 h-4 ${statusConfig_.color.replace('bg-', 'text-')}`} />
                            <span className="text-sm font-medium">{statusConfig_.label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Poslední přihlášení: {new Date(user.lastLogin).toLocaleDateString('cs-CZ')}
                          </div>
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
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {selectedUser.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedUser.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Základní informace</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <Badge className={`${roles.find(r => r.id === selectedUser.role)?.color} text-white text-xs`}>
                        {roles.find(r => r.id === selectedUser.role)?.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={`${statusConfig[selectedUser.status as keyof typeof statusConfig].color} text-white text-xs`}>
                        {statusConfig[selectedUser.status as keyof typeof statusConfig].label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vytvořen</span>
                      <span className="text-foreground">
                        {new Date(selectedUser.createdAt).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Přiřazené projekty</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.projects.map((project) => (
                      <Badge key={project} variant="outline" className="text-xs">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Permissions Overview */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Přehled oprávnění</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedUser.permissions).map(([module, permission]) => (
                      <div key={module} className="flex items-center justify-between p-2 rounded bg-surface">
                        <span className="text-sm text-foreground capitalize">
                          {module === 'campaigns' ? 'Kampaně' :
                           module === 'analytics' ? 'Analýzy' :
                           module === 'invoices' ? 'Faktury' :
                           module === 'partners' ? 'Partneři' :
                           module === 'users' ? 'Uživatelé' :
                           module === 'exports' ? 'Exporty' : module}
                        </span>
                        {getPermissionIcon(permission)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Upravit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Lock className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {roles.map((role) => {
            const RoleIcon = role.icon;
            
            return (
              <Card key={role.id} className="hover:shadow-medium transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${role.color} text-white`}>
                      <RoleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{role.userCount} uživatelů</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                  
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Klíčová oprávnění</h4>
                    <div className="space-y-1">
                      {role.permissions.map((permission, index) => (
                        <div key={index} className="text-xs text-muted-foreground flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span>{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Upravit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <Card>
          <CardHeader>
            <CardTitle>Matice oprávnění</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Modul</th>
                    {roles.map((role) => (
                      <th key={role.id} className="text-center p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <role.icon className="w-4 h-4" />
                          <span>{role.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['campaigns', 'analytics', 'invoices', 'partners', 'users', 'exports'].map((module) => (
                    <tr key={module} className="border-b border-border hover:bg-surface">
                      <td className="p-3 font-medium">
                        {module === 'campaigns' ? 'Kampaně' :
                         module === 'analytics' ? 'Analýzy' :
                         module === 'invoices' ? 'Faktury' :
                         module === 'partners' ? 'Partneři' :
                         module === 'users' ? 'Uživatelé' :
                         module === 'exports' ? 'Exporty' : module}
                      </td>
                      {roles.map((role) => {
                        const user = users.find(u => u.role === role.id);
                        const permission = user?.permissions[module as keyof typeof user.permissions];
                        
                        return (
                          <td key={role.id} className="p-3 text-center">
                            {permission && getPermissionIcon(permission)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-sofinity-purple" />
                <span>Plný přístup</span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-sofinity-orange" />
                <span>Čtení a zápis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>Pouze čtení</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span>Bez přístupu</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}