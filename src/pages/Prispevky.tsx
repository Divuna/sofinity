import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { 
  MessageSquare, 
  Search, 
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Video
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

interface Post {
  id: string;
  channel: string;
  text: string;
  status: string;
  publish_date: string;
  created_at: string;
  project_id: string | null;
  user_id: string;
}

const channelIcons = {
  Facebook: Facebook,
  Instagram: Instagram,
  LinkedIn: Linkedin,
  TikTok: Video
};

const statusColors = {
  draft: 'secondary',
  planned: 'default',
  published: 'success'
};

const statusLabels = {
  draft: 'Koncept',
  planned: 'Naplánováno',
  published: 'Publikováno'
};

export default function Prispevky() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProject?.id) {
      fetchPosts();
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    applyFilters();
  }, [posts, searchText, statusFilter, channelFilter]);

  const fetchPosts = async () => {
    if (!selectedProject?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst příspěvky.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = posts;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(post =>
        post.text.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(post => post.status === statusFilter);
    }

    // Channel filter
    if (channelFilter !== 'all') {
      filtered = filtered.filter(post => post.channel === channelFilter);
    }

    setFilteredPosts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDeletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: 'Příspěvek byl úspěšně smazán.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat příspěvek.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd. MMMM yyyy, HH:mm', { locale: cs });
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  const getChannelIcon = (channel: string) => {
    const IconComponent = channelIcons[channel as keyof typeof channelIcons];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Vyberte projekt pro zobrazení příspěvků.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Správa příspěvků</h1>
        <p className="text-muted-foreground">
          Spravujte příspěvky pro projekt: <span className="font-medium">{selectedProject.name}</span>
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtry a vyhledávání
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vyhledávání v textu</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat v textu příspěvků..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Stav</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="draft">Koncept</SelectItem>
                  <SelectItem value="planned">Naplánováno</SelectItem>
                  <SelectItem value="published">Publikováno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kanál</label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny kanály" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny kanály</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Příspěvky ({filteredPosts.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Načítání příspěvků...</p>
            </div>
          ) : currentPosts.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {filteredPosts.length === 0 && posts.length > 0 
                  ? 'Žádné příspěvky nevyhovují filtrům.'
                  : 'Zatím žádné příspěvky.'
                }
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kanál</TableHead>
                    <TableHead>Text</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Datum publikace</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(post.channel)}
                          <span className="font-medium">{post.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm">{truncateText(post.text)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[post.status as keyof typeof statusColors] as any}>
                          {statusLabels[post.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(post.publish_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(post.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Zobrazeno {startIndex + 1}-{Math.min(endIndex, filteredPosts.length)} z {filteredPosts.length} příspěvků
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Předchozí
                    </Button>
                    <span className="text-sm">
                      Stránka {currentPage} z {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Další
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}