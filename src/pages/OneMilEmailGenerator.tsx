import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Image, Video, Send, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { sanitizeHTML, htmlToPlainText } from '@/lib/html-sanitizer';

const ONEMILL_PROJECT_ID = "defababe-004b-4c63-9ff1-311540b0a3c9";

interface EmailDraft {
  id: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  created_at: string;
  user_id: string;
  project_id: string;
}

interface MediaFile {
  id: string;
  media_type: string;
  media_url: string;
  file_name: string;
  generated_by_ai: boolean;
  created_at: string;
}

export default function OneMilEmailGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  // Form states
  const [prompt, setPrompt] = useState('');
  const [emailType, setEmailType] = useState('newsletter');
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'banner' | 'video'>('image');
  const [batchSize, setBatchSize] = useState(10);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('Emails')
        .select('*')
        .eq('project_id', ONEMILL_PROJECT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error: any) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst koncepty e-mailů",
        variant: "destructive",
      });
    }
  };

  const fetchMediaFiles = async (emailId: string) => {
    try {
      const { data, error } = await supabase
        .from('EmailMedia')
        .select('*')
        .eq('email_id', emailId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching media files:', error);
      setMediaFiles([]);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  useEffect(() => {
    if (selectedDraft) {
      fetchMediaFiles(selectedDraft.id);
    }
  }, [selectedDraft]);

  const generateEmail = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte prompt pro generování e-mailu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: emailType,
          prompt: prompt,
          project_id: ONEMILL_PROJECT_ID
        }
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to generate email");
      }

      if (functionData?.success) {
        toast({
          title: "Úspěch",
          description: "E-mail byl úspěšně vygenerován a uložen jako koncept",
        });
        setPrompt('');
        await fetchDrafts();
      } else {
        throw new Error(functionData?.error || "Unknown error");
      }
    } catch (error: any) {
      console.error('Error generating email:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vygenerovat e-mail",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMedia = async () => {
    if (!selectedDraft || !mediaPrompt.trim()) {
      toast({
        title: "Chyba",
        description: "Vyberte e-mail a zadejte prompt pro generování média",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-media', {
        body: {
          email_id: selectedDraft.id,
          media_type: mediaType,
          prompt: mediaPrompt
        }
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to generate media");
      }

      if (functionData?.success) {
        toast({
          title: "Úspěch",
          description: `${mediaType} bylo úspěšně vygenerováno`,
        });
        setMediaPrompt('');
        await fetchMediaFiles(selectedDraft.id);
      } else {
        throw new Error(functionData?.error || "Unknown error");
      }
    } catch (error: any) {
      console.error('Error generating media:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vygenerovat médium",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async (emailId?: string) => {
    setLoading(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-campaign-emails', {
        body: {
          email_id: emailId,
          campaign_id: emailId ? undefined : ONEMILL_PROJECT_ID,
          batch_size: batchSize
        }
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to send campaign");
      }

      if (functionData?.success) {
        toast({
          title: "Úspěch",
          description: `Kampaň odeslána: ${functionData.sent_count} e-mailů odesláno`,
        });
        await fetchDrafts();
      } else {
        throw new Error(functionData?.error || "Unknown error");
      }
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se odeslat kampaň",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('Emails')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Koncept byl smazán",
      });
      
      if (selectedDraft?.id === draftId) {
        setSelectedDraft(null);
      }
      
      await fetchDrafts();
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat koncept",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">OneMil E-mail Generátor</h1>
        <Button onClick={fetchDrafts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Obnovit
        </Button>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">AI Generátor</TabsTrigger>
          <TabsTrigger value="drafts">Koncepty & Plánovaná Publikace</TabsTrigger>
          <TabsTrigger value="media">Multimédia</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Generování E-mailů
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Typ e-mailu</label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotion">Propagační</SelectItem>
                    <SelectItem value="announcement">Oznámení</SelectItem>
                    <SelectItem value="welcome">Uvítací</SelectItem>
                    <SelectItem value="follow-up">Následný</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Prompt pro AI</label>
                <Textarea
                  placeholder="Popište, jaký e-mail chcete vygenerovat..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={generateEmail} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Vygenerovat E-mail
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Koncepty E-mailů ({drafts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDraft?.id === draft.id ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedDraft(draft)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium truncate">{draft.subject}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={draft.status === 'draft' ? 'secondary' : 'default'}>
                              {draft.status}
                            </Badge>
                            <Badge variant="outline">{draft.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(draft.created_at).toLocaleDateString('cs-CZ')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendCampaign(draft.id);
                            }}
                            disabled={loading}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDraft(draft.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedDraft && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Náhled E-mailu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Předmět</label>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedDraft.subject}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Obsah</label>
                      {(() => {
                        const { safe, html } = sanitizeHTML(selectedDraft.content);
                        
                        if (!safe || html.length === 0) {
                          toast({
                            title: "Nebezpečný obsah blokován",
                            description: "Email obsahuje potenciálně nebezpečný kód. Zobrazuji bezpečnou verzi.",
                            variant: "destructive"
                          });
                          return (
                            <div className="text-sm bg-gray-50 p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
                              {htmlToPlainText(selectedDraft.content)}
                            </div>
                          );
                        }
                        
                        return (
                          <div 
                            className="text-sm bg-gray-50 p-3 rounded max-h-64 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: html }}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Velikost batch (10)"
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value) || 10)}
                        className="w-32"
                      />
                      <Button 
                        onClick={() => sendCampaign(selectedDraft.id)} 
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Odeslat E-mail
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Batch Akce</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">Velikost batch</label>
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value) || 10)}
                    className="w-32"
                  />
                </div>
                <Button 
                  onClick={() => sendCampaign()} 
                  disabled={loading || drafts.length === 0}
                  variant="default"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Odeslat Všechny Koncepty
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Generování Multimédií
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDraft ? (
                <p className="text-muted-foreground">Nejdříve vyberte e-mail v záložce "Koncepty"</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Typ média</label>
                    <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Obrázek</SelectItem>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prompt pro AI</label>
                    <Textarea
                      placeholder="Popište, jaké médium chcete vygenerovat..."
                      value={mediaPrompt}
                      onChange={(e) => setMediaPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button onClick={generateMedia} disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Video className="h-4 w-4 mr-2" />
                    )}
                    Vygenerovat {mediaType}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {selectedDraft && mediaFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vygenerovaná Média ({mediaFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaFiles.map((file) => (
                    <div key={file.id} className="border rounded-lg p-3">
                      <div className="aspect-video bg-gray-100 rounded mb-2 overflow-hidden">
                        {file.media_type === 'image' || file.media_type === 'banner' ? (
                          <img 
                            src={file.media_url} 
                            alt={file.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">{file.media_type}</Badge>
                          <Badge variant={file.generated_by_ai ? 'default' : 'secondary'}>
                            {file.generated_by_ai ? 'AI' : 'Manual'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}