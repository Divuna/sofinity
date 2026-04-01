import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Bot, Zap, CheckCircle, XCircle, Clock, Loader2, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1"><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Hotovo</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs px-2.5 py-1"><XCircle className="w-3.5 h-3.5 mr-1.5" />Chyba</Badge>;
    default:
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-2.5 py-1"><Clock className="w-3.5 h-3.5 mr-1.5" />Čeká</Badge>;
  }
};

const formatTime = (date: string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
};

export default function MarketingAgent() {
  const { selectedProject } = useSelectedProject();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [detailCampaign, setDetailCampaign] = useState<{ id: string; name: string; post: string | null } | null>(null);

  // 1. Agent status — last 5 campaign_generator requests
  const { data: agentActions = [] } = useQuery({
    queryKey: ['agent-actions'],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      const { data, error } = await supabase
        .from('AIRequests')
        .select('id, prompt, status, created_at')
        .eq('type', 'campaign_generator')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedProject?.id,
    refetchInterval: 5000,
  });

  const isAgentActive = agentActions.some((a) => a.status === 'waiting');

  // 2. Pending campaigns
  const { data: pendingCampaigns = [] } = useQuery({
    queryKey: ['pending-campaigns', selectedProject?.id],
    queryFn: async () => {
      let query = supabase
        .from('Campaigns')
        .select('id, name, post, created_at')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      if (selectedProject?.id) {
        query = query.eq('project_id', selectedProject.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  // Approve / reject mutation
  const updateCampaign = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('Campaigns')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === 'active' ? 'Kampaň schválena ✅' : 'Kampaň zamítnuta ❌' });
      queryClient.invalidateQueries({ queryKey: ['pending-campaigns'] });
    },
  });

  // 3. Create campaign — call edge function
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert AIRequest first
      const { data: aiReq, error: insertErr } = await supabase
        .from('AIRequests')
        .insert({
          type: 'campaign_generator',
          prompt: prompt.trim(),
          status: 'waiting',
          user_id: user?.id,
          project_id: selectedProject?.id ?? null,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Call dispatcher
      const { error: fnErr } = await supabase.functions.invoke('sofinity-agent-dispatcher', {
        body: {
          id: aiReq.id,
          user_id: user?.id,
          type: 'campaign_generator',
          prompt: prompt.trim(),
        },
      });

      if (fnErr) throw fnErr;

      toast({ title: 'Agent spuštěn 🚀', description: 'Kampaň se generuje…' });
      setPrompt('');
      queryClient.invalidateQueries({ queryKey: ['agent-actions'] });
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(30,100%,51%)] bg-clip-text text-transparent">
          Marketing Agent
        </h1>
        <p className="text-muted-foreground mt-1">AI agent pro automatické generování kampaní</p>
      </div>

      {/* SECTION 1: Agent Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Stav agenta
            {isAgentActive ? (
              <span className="relative flex h-3 w-3 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            ) : (
              <span className="relative flex h-3 w-3 ml-2">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/40" />
              </span>
            )}
          </CardTitle>
          <CardDescription>{isAgentActive ? 'Agent pracuje…' : 'Agent je nečinný'}</CardDescription>
        </CardHeader>
        <CardContent>
          {agentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné nedávné akce</p>
          ) : (
            <div className="divide-y divide-border">
              {agentActions.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(a.created_at)}</span>
                    <span className="text-sm truncate">{a.prompt?.substring(0, 60)}{(a.prompt?.length ?? 0) > 60 ? '…' : ''}</span>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Pending Campaigns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-[hsl(30,100%,51%)]" />
            Kampaně ke schválení
          </CardTitle>
          <CardDescription>Kampaně ve stavu „draft" čekající na vaše rozhodnutí</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const filtered = pendingCampaigns.filter((c) => !c.name.startsWith('AI Campaign'));
            const hasMore = filtered.length > 6;
            const visible = filtered.slice(0, 6);

            if (visible.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Inbox className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">Žádné kampaně ke schválení</p>
                </div>
              );
            }

            return (
              <>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {visible.map((c) => (
                    <Card key={c.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold">{c.name}</h4>
                        {c.post && <p className="text-sm text-muted-foreground line-clamp-3">{c.post}</p>}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => updateCampaign.mutate({ id: c.id, status: 'active' })}
                            disabled={updateCampaign.isPending}
                          >
                            Schválit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCampaign.mutate({ id: c.id, status: 'rejected' })}
                            disabled={updateCampaign.isPending}
                          >
                            Zamítnout
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-4 text-center">
                    <Link to="/campaigns" className="text-sm text-primary hover:underline">Zobrazit vše →</Link>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* SECTION 3: Create Campaign */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Vytvořit kampaň</CardTitle>
          <CardDescription>Popište cíl kampaně a agent ji vygeneruje</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Co je cílem kampaně?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={isSubmitting || !prompt.trim()}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Agent pracuje…</> : 'Spustit agenta'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
