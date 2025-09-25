import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2,
  Facebook,
  Instagram,
  Mail,
  Youtube
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

interface Post {
  id: string;
  text: string;
  format: string;
  channel: string;
  publish_date: string;
  status: 'planned' | 'published';
  project_id: string | null;
  created_at: string;
}

interface PostFromDB {
  id: string;
  text: string;
  format: string;
  channel: string;
  publish_date: string;
  status: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const channelColors = {
  facebook: 'bg-blue-500',
  instagram: 'bg-purple-500', 
  email: 'bg-orange-500',
  youtube: 'bg-red-500'
};

const channelIcons = {
  facebook: Facebook,
  instagram: Instagram,
  email: Mail,
  youtube: Youtube
};

export default function PlanovacPublikace() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newPost, setNewPost] = useState({
    text: '',
    format: 'post',
    channel: '',
    publish_date: new Date()
  });
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProject?.id) {
      fetchPosts();
    }
  }, [selectedProject]);

  const fetchPosts = async () => {
    if (!selectedProject?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('publish_date', { ascending: true });

      if (error) throw error;
      const postsData = (data || []).map((post: PostFromDB): Post => ({
        id: post.id,
        text: post.text,
        format: post.format,
        channel: post.channel,
        publish_date: post.publish_date,
        status: (post.status === 'published' ? 'published' : 'planned') as 'planned' | 'published',
        project_id: post.project_id,
        created_at: post.created_at
      }));
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst příspěvky",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          text: newPost.text,
          format: newPost.format,
          channel: newPost.channel,
          publish_date: newPost.publish_date.toISOString(),
          project_id: selectedProject.id,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      const addedPost: Post = {
        id: data.id,
        text: data.text,
        format: data.format,
        channel: data.channel,
        publish_date: data.publish_date,
        status: (data.status === 'published' ? 'published' : 'planned') as 'planned' | 'published',
        project_id: data.project_id,
        created_at: data.created_at
      };

      setPosts([...posts, addedPost]);
      setIsAddDialogOpen(false);
      setNewPost({
        text: '',
        format: 'post',
        channel: '',
        publish_date: new Date()
      });

      toast({
        title: "Úspěch",
        description: "Příspěvek byl naplánován"
      });
    } catch (error) {
      console.error('Error adding post:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se naplánovat příspěvek",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (postId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'planned' ? 'published' : 'planned';
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(post => 
        post.id === postId ? { ...post, status: newStatus as 'planned' | 'published' } : post
      ));

      toast({
        title: "Úspěch",
        description: `Stav příspěvku změněn na ${newStatus === 'published' ? 'publikováno' : 'plánováno'}`
      });
    } catch (error) {
      console.error('Error updating post status:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav příspěvku",
        variant: "destructive"
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postId));
      toast({
        title: "Úspěch",
        description: "Příspěvek byl smazán"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat příspěvek",
        variant: "destructive"
      });
    }
  };

  const groupedPosts = posts.reduce((acc, post) => {
    const date = format(new Date(post.publish_date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  if (!selectedProject?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Vyberte projekt</h3>
          <p className="text-muted-foreground">Pro zobrazení plánovače publikací nejprve vyberte projekt</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání příspěvků...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Plánovač publikací{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Plánování a správa příspěvků na sociálních sítích
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="shadow-strong">
              <Plus className="w-4 h-4 mr-2" />
              Nový příspěvek
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Naplánovat příspěvek</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="text">Text příspěvku</Label>
                <Textarea
                  id="text"
                  value={newPost.text}
                  onChange={(e) => setNewPost({ ...newPost, text: e.target.value })}
                  placeholder="Napište obsah vašeho příspěvku..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="format">Formát</Label>
                  <Select value={newPost.format} onValueChange={(value) => setNewPost({ ...newPost, format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Příspěvek</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="channel">Kanál</Label>
                  <Select value={newPost.channel} onValueChange={(value) => setNewPost({ ...newPost, channel: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Datum publikace</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newPost.publish_date, 'PPP', { locale: cs })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newPost.publish_date}
                      onSelect={(date) => date && setNewPost({ ...newPost, publish_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button onClick={handleAddPost} disabled={!newPost.text || !newPost.channel}>
                  Naplánovat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar and Posts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Kalendář</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Posts Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Naplánované příspěvky</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedPosts).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedPosts)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, datePosts]) => (
                      <div key={date} className="space-y-3">
                        <h3 className="font-medium text-foreground border-b pb-2">
                          {format(new Date(date), 'EEEE, d. MMMM yyyy', { locale: cs })}
                        </h3>
                        <div className="space-y-2">
                          {datePosts.map((post) => {
                            const Icon = channelIcons[post.channel as keyof typeof channelIcons];
                            return (
                              <div
                                key={post.id}
                                className="p-4 rounded-lg border bg-surface hover:shadow-soft transition-all duration-200"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <div className={`p-2 rounded-lg ${channelColors[post.channel as keyof typeof channelColors]} text-white`}>
                                      {Icon && <Icon className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Badge variant="outline" className="text-xs">
                                          {post.format}
                                        </Badge>
                                        <Badge 
                                          variant={post.status === 'published' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {post.status === 'published' ? 'Publikováno' : 'Plánováno'}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-foreground line-clamp-2">
                                        {post.text}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(post.publish_date), 'HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={post.status === 'published'}
                                      onCheckedChange={() => handleToggleStatus(post.id, post.status)}
                                    />
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => handleDeletePost(post.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Zatím nemáte žádné naplánované příspěvky</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Naplánovat první příspěvek
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}