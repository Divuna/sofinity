import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Mail,
  Eye,
  MousePointer,
  Clock,
  User,
  Calendar,
  BarChart3,
  Copy,
  Save,
  Send,
  MessageSquare,
  TestTube,
  ShieldCheck
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailItem {
  id: string;
  content: string;
  user_id: string;
  recipient: string | null;
  project: string | null;
  type: string;
  status: string | null;
  subject: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string | null;
  status: string | null;
  message_id: string | null;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  campaign_id: string | null;
}

export default function EmailDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [emailMode, setEmailMode] = useState<'test' | 'production'>('production');
  const [feedbackStats, setFeedbackStats] = useState<{positive: number; negative: number} | null>(null);
  const [comments, setComments] = useState<Array<{id: string; comment: string; submitted_at: string}>>([]);

  useEffect(() => {
    if (id) {
      fetchEmailData();
    }
  }, [id]);

  const fetchEmailData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      // Fetch email
      const { data: emailData, error: emailError } = await supabase
        .from('Emails')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (emailError) throw emailError;
      setEmail(emailData);

      // Fetch user preferences for email mode
      const { data: userPrefs } = await supabase
        .from('UserPreferences')
        .select('email_mode')
        .eq('user_id', user.id)
        .single();
      
      if (userPrefs?.email_mode) {
        setEmailMode(userPrefs.email_mode as 'test' | 'production');
      }

      // Fetch related email logs
      const { data: logsData } = await supabase
        .from('EmailLogs')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false });
      
      setEmailLogs(logsData || []);

      // Fetch feedback stats
      const { data: feedbackData } = await supabase
        .from('Feedback')
        .select('feedback_type')
        .eq('email_id', id)
        .eq('source', 'email');

      if (feedbackData && feedbackData.length > 0) {
        const positive = feedbackData.filter(f => f.feedback_type === 'positive').length;
        const negative = feedbackData.filter(f => f.feedback_type === 'negative').length;
        setFeedbackStats({ positive, negative });
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('Feedback')
        .select('id, comment, submitted_at')
        .eq('email_id', id)
        .eq('source', 'email')
        .not('comment', 'is', null)
        .order('submitted_at', { ascending: false });

      if (commentsData) {
        setComments(commentsData);
      }

    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data e-mailu",
        variant: "destructive"
      });
      navigate('/emails');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Zkopírováno",
        description: "Obsah byl zkopírován do schránky"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat obsah",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!email) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const { error } = await supabase
        .from('Emails')
        .update({
          content: email.content,
          type: email.type,
          project: email.project,
          subject: email.subject
        })
        .eq('id', email.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Uloženo",
        description: "E-mail byl úspěšně aktualizován"
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) return;
    
    // Re-fetch email data to ensure we have the latest recipient info
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const { data: freshEmailData, error: refetchError } = await supabase
        .from('Emails')
        .select('*')
        .eq('id', email.id)
        .eq('user_id', user.id)
        .single();

      if (refetchError) throw refetchError;

      // Use database recipient if local state is empty, otherwise use local state
      let recipientToUse = email.recipient?.trim() || freshEmailData?.recipient?.trim();
      
      // Apply email mode logic
      if (emailMode === 'test') {
        recipientToUse = 'support@opravo.cz';
      }
      
      if (!recipientToUse) {
        toast({
          title: "Chyba",
          description: "Příjemce e-mailu není vyplněn",
          variant: "destructive"
        });
        return;
      }

      // Update local state with fresh data if needed
      if (freshEmailData && (!email.recipient?.trim() && freshEmailData.recipient?.trim())) {
        setEmail(freshEmailData);
      }

      // Ensure we have a subject (use fallback if needed)
      const finalSubject = email.subject?.trim() || `Opravo – ${email.type || email.project || 'Zpráva'}`;
      
      // Update subject in state if using fallback
      if (!email.subject?.trim()) {
        setEmail(prev => prev ? { ...prev, subject: finalSubject } : prev);
      }

      if (!email.content?.trim()) {
        toast({
          title: "Chyba", 
          description: "Obsah e-mailu je prázdný",
          variant: "destructive"
        });
        return;
      }
      
      setSending(true);

      const response = await supabase.functions.invoke('send-email', {
        body: {
          email_id: email.id,
          recipient: recipientToUse,
          subject: finalSubject,
          content: email.content,
          email_mode: emailMode
        }
      });

      // Handle structured response from hardened send-email function
      const result = response.data;
      
      if (!result?.ok) {        
        const errorMsg = result?.error?.message || 'Nepodařilo se odeslat e-mail';
        toast({
          title: "Chyba při odesílání",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }

      // Update status to 'sent' only after successful sending
      setEmail(prev => prev ? { ...prev, status: 'sent' } : prev);

      toast({
        title: "E-mail odeslán",
        description: `E-mail byl úspěšně odeslán na ${recipientToUse}${emailMode === 'test' ? ' (testovací režim)' : ''}`
      });

      // Refresh email data to get updated logs
      await fetchEmailData();
      
    } catch (error) {      
      toast({
        title: "Chyba při odesílání",
        description: error instanceof Error ? error.message : "Nepodařilo se odeslat e-mail",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestSend = async () => {
    // Placeholder for test send functionality
    toast({
      title: "Test odeslání",
      description: "Funkce test odeslání bude implementována",
    });
  };

  const handleDuplicate = async () => {
    if (!email) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const duplicateData = {
        content: email.content,
        type: email.type,
        recipient: email.recipient,
        subject: email.subject || `Opravo – ${email.type || email.project || 'Zpráva'}`,
        project: email.project + " (kopie)",
        project_id: null,
        user_id: user.id
      };

      const { data: newEmail, error } = await supabase
        .from('Emails')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Duplikace byla úspěšně vytvořena",
        description: "Přesměrování na nový e-mail..."
      });

      navigate(`/emails/${newEmail.id}`);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit duplikaci",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Načítání e-mailu...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">E-mail nenalezen</p>
      </div>
    );
  }

  const latestLog = emailLogs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/emails')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detail e-mailu</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{email.type}</Badge>
              {email.project && (
                <Badge variant="secondary">{email.project}</Badge>
              )}
              <Badge variant={emailMode === 'test' ? "destructive" : "default"} className="flex items-center gap-1">
                {emailMode === 'test' ? <TestTube className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                {emailMode === 'test' ? 'Testovací režim' : 'Produkční režim'}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Vytvořeno {new Date(email.created_at).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(email.content)}>
            <Copy className="w-4 h-4 mr-2" />
            Kopírovat obsah
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplikovat
          </Button>
          <Button 
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Zrušit úpravy" : "Upravit a uložit"}
          </Button>
          {isEditing && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Ukládání...' : 'Uložit'}
            </Button>
          )}
          {email.status === 'draft' && email.content?.trim() && !loading && (
            <Button 
              onClick={handleSendEmail} 
              disabled={sending || !email.content?.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Odesílání...' : 'Odeslat e-mail'}
            </Button>
          )}
          <Button variant="outline" onClick={handleTestSend}>
            <Send className="w-4 h-4 mr-2" />
            Odeslat test
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Email Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Obsah e-mailu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Předmět</label>
                  {isEditing ? (
                    <Input
                      value={email.subject || ''}
                      onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                      placeholder="Opravo – Email kampaň"
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                      {email.subject || 'Není nastaveno'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Obsah</label>
                  {isEditing ? (
                    <Textarea
                      value={email.content}
                      onChange={(e) => setEmail({ ...email, content: e.target.value })}
                      rows={12}
                      className="font-mono text-sm mt-1"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-muted rounded-lg mt-1">
                      {email.content}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Náhled v e-mailovém klientovi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg p-4 bg-card">
                <div className="border-b border-border pb-4 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">Od: noreply@sofinity.com</div>
                      <div className="text-muted-foreground">
                        Komu: {emailMode === 'test' ? 'support@opravo.cz (testovací režim)' : (email.recipient?.trim() || 'Neurčeno')}
                      </div>
                      <div className="font-medium text-foreground">
                        Předmět: {email.subject || `Opravo – ${email.type || email.project || 'Zpráva'}`}
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(email.created_at).toLocaleString('cs-CZ')}
                    </div>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {email.content}
                </div>
                <div className="border-t border-border pt-4 mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Byl tento e-mail užitečný?
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <a 
                      href={`/feedback/${email.id}/positive`}
                      className="text-sm text-primary hover:underline"
                    >
                      👍 Ano
                    </a>
                    <a 
                      href={`/feedback/${email.id}/negative`}
                      className="text-sm text-primary hover:underline"
                    >
                      👎 Ne
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Stats Card */}
          {feedbackStats && (feedbackStats.positive > 0 || feedbackStats.negative > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Hodnocení e-mailu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👍</span>
                    <span className="text-sm text-muted-foreground">Pozitivní hodnocení:</span>
                  </div>
                  <span className="text-sm font-medium">{feedbackStats.positive}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👎</span>
                    <span className="text-sm text-muted-foreground">Negativní hodnocení:</span>
                  </div>
                  <span className="text-sm font-medium">{feedbackStats.negative}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          {comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Komentáře od uživatelů
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 pr-4">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-border pb-3 last:border-b-0">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm text-foreground leading-relaxed">
                              {comment.comment}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Přidáno: {new Date(comment.submitted_at).toLocaleDateString('cs-CZ', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Email Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informace o příjemci
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">E-mail:</span>
                <span className="text-sm font-medium">
                  {email.recipient || 'Neurčeno'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Typ:</span>
                <Badge variant="outline">{email.type}</Badge>
              </div>
              {email.project && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projekt:</span>
                  <Badge variant="secondary">{email.project}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {latestLog && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistiky doručení
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm">Odesláno</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(latestLog.sent_at).toLocaleString('cs-CZ')}
                  </div>
                </div>

                {latestLog.opened_at ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="text-sm">Otevřeno</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(latestLog.opened_at).toLocaleString('cs-CZ')}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Neotevřeno</span>
                    </div>
                  </div>
                )}

                {latestLog.clicked_at ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-success" />
                      <span className="text-sm">Kliknuto</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(latestLog.clicked_at).toLocaleString('cs-CZ')}
                    </div>
                  </div>
                ) : latestLog.opened_at ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Nekliknuto</span>
                    </div>
                  </div>
                ) : null}

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stav:</span>
                    <Badge variant={
                      latestLog.clicked_at ? 'default' :
                      latestLog.opened_at ? 'secondary' : 'outline'
                    }>
                      {latestLog.clicked_at ? 'Kliknuto' :
                       latestLog.opened_at ? 'Otevřeno' : 'Odesláno'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Timeline */}
          {emailLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Historie událostí
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailLogs.map((log, index) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {log.clicked_at ? 'Kliknuto na odkaz' :
                           log.opened_at ? 'E-mail otevřen' : 'E-mail odeslán'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(
                            log.clicked_at || log.opened_at || log.sent_at
                          ).toLocaleString('cs-CZ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}