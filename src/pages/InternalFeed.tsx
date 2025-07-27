import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Pin, 
  MessageSquare, 
  Users, 
  Calendar,
  Plus,
  Search,
  Filter,
  Heart,
  Share2,
  MoreVertical
} from 'lucide-react';

const internalPosts = [
  {
    id: 1,
    type: 'announcement',
    title: 'Nová AI funkce pro automatizaci emailů',
    content: 'Spustili jsme novou funkci pro automatické generování a odesílání emailových kampaní. Tím se zvýší efektivita našich marketingových aktivit o 40%.',
    author: {
      name: 'Tomáš Novák',
      role: 'Product Manager',
      avatar: 'TN'
    },
    timestamp: 'před 2 hodinami',
    project: 'Sofinity Core',
    likes: 8,
    comments: 3,
    isPinned: true,
    tags: ['AI', 'Email', 'Automatizace']
  },
  {
    id: 2,
    type: 'update',
    title: 'BikeShare24 - nové lokace v Praze',
    content: 'Úspěšně jsme rozšířili síť sdílených kol o 15 nových stanovišť. Kampaň na sociálních sítích generovala 2.4K nových registrací.',
    author: {
      name: 'Anna Svobodová',
      role: 'Marketing Specialist',
      avatar: 'AS'
    },
    timestamp: 'včera',
    project: 'BikeShare24',
    likes: 12,
    comments: 5,
    isPinned: false,
    tags: ['Expanze', 'Praha', 'Marketing']
  },
  {
    id: 3,
    type: 'success',
    title: 'Opravo dosáhlo 10K+ uživatelů',
    content: 'Aplikace pro mobilní opravy překročila hranici 10 tisíc aktivních uživatelů. Měsíční růst 35% díky AI optimalizaci kampaní.',
    author: {
      name: 'Pavel Dvořák',
      role: 'Growth Lead',
      avatar: 'PD'
    },
    timestamp: 'před 2 dny',
    project: 'Opravo',
    likes: 15,
    comments: 7,
    isPinned: false,
    tags: ['Milestone', 'Growth', 'Opravo']
  },
  {
    id: 4,
    type: 'note',
    title: 'CoDneska - týdenní retrospektiva',
    content: 'Shrnutí týdne: 150 nových událostí, 5K+ uživatelských interakcí, 3 nové partnerství s lokálními podniky.',
    author: {
      name: 'Martina Horáková',
      role: 'Community Manager',
      avatar: 'MH'
    },
    timestamp: 'před 3 dny',
    project: 'CoDneska',
    likes: 6,
    comments: 2,
    isPinned: false,
    tags: ['Retrospektiva', 'Community']
  }
];

const postTypeConfig = {
  announcement: { color: 'bg-sofinity-purple', label: 'Oznámení' },
  update: { color: 'bg-sofinity-orange', label: 'Aktualizace' },
  success: { color: 'bg-success', label: 'Úspěch' },
  note: { color: 'bg-muted', label: 'Poznámka' }
};

export default function InternalFeed() {
  const [newPost, setNewPost] = useState({ title: '', content: '', project: 'Sofinity Core', type: 'note' });
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interní Feed</h1>
          <p className="text-muted-foreground mt-1">
            Firemní novinky, aktualizace a týmová komunikace
          </p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          Nový příspěvek
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Stats & Filters */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Rychlé statistiky</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tento týden</span>
                <span className="font-medium">12 příspěvků</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aktivní uživatelé</span>
                <span className="font-medium">28 členů</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Průměrné engagement</span>
                <span className="font-medium">8.4 reakcí</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Projekt</label>
                <select className="w-full p-2 border border-border rounded-md bg-background">
                  <option>Všechny projekty</option>
                  <option>Sofinity Core</option>
                  <option>Opravo</option>
                  <option>BikeShare24</option>
                  <option>CoDneska</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Typ příspěvku</label>
                <select className="w-full p-2 border border-border rounded-md bg-background">
                  <option>Všechny typy</option>
                  <option>Oznámení</option>
                  <option>Aktualizace</option>
                  <option>Úspěchy</option>
                  <option>Poznámky</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-3">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat v příspěvcích..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {internalPosts.map((post) => {
              const typeConfig = postTypeConfig[post.type as keyof typeof postTypeConfig];
              
              return (
                <Card key={post.id} className="hover:shadow-medium transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-medium">
                          {post.author.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{post.author.name}</div>
                          <div className="text-sm text-muted-foreground">{post.author.role}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {post.isPinned && (
                          <Pin className="w-4 h-4 text-sofinity-orange" />
                        )}
                        <Badge className={`${typeConfig.color} text-white text-xs`}>
                          {typeConfig.label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{post.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{post.content}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{post.project}</span>
                        <span>{post.timestamp}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                          <Heart className="w-4 h-4 mr-1" />
                          {post.likes}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {post.comments}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}