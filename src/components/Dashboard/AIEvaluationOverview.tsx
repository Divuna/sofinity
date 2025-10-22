import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Brain, Eye } from 'lucide-react';

interface AIRequest {
  id: string;
  type: string;
  status: string;
  response: string | null;
  created_at: string;
  event_name: string | null;
  metadata: any;
  prompt: string | null;
}

interface AIEvaluationOverviewProps {
  aiRequests: AIRequest[];
}

export const AIEvaluationOverview: React.FC<AIEvaluationOverviewProps> = ({ aiRequests }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AIRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter only evaluator type requests
  const evaluatorRequests = aiRequests
    .filter(req => req.type === 'evaluator')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayedRequests = showAll ? evaluatorRequests : evaluatorRequests.slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'done':
        return <Badge variant="default" className="bg-success text-success-foreground">🟢 Dokončeno</Badge>;
      case 'waiting':
      case 'pending':
        return <Badge variant="secondary">🟡 Čekání</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="destructive">🔴 Chyba</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return 'Bez odpovědi';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleOpenDetail = (request: AIRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const ToggleButton = () => (
    evaluatorRequests.length > 5 && (
      <div className="flex justify-center py-2">
        <Button
          variant="outline"
          onClick={() => setShowAll(!showAll)}
          className="w-full max-w-xs"
        >
          {showAll ? 'Skrýt' : 'Zobrazit vše'}
        </Button>
      </div>
    )
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI hodnocení kampaní
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {evaluatorRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Zatím žádná AI hodnocení kampaní
            </p>
          ) : (
            <>
              <ToggleButton />

              <div className="space-y-3">
                {displayedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(request)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {request.event_name || 'Neznámá událost'}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {truncateText(request.response)}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: cs })}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(request);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <ToggleButton />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail hodnocení</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Typ události</h3>
                <p className="text-sm">{selectedRequest.event_name || 'Neznámá událost'}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Datum vytvoření</h3>
                <p className="text-sm">
                  {format(new Date(selectedRequest.created_at), 'dd. MMMM yyyy HH:mm:ss', { locale: cs })}
                </p>
              </div>

              {selectedRequest.prompt && (
                <div>
                  <h3 className="font-semibold mb-2">Prompt</h3>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {selectedRequest.prompt}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">AI odpověď</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {selectedRequest.response || 'Bez odpovědi'}
                </p>
              </div>

              {selectedRequest.metadata && Object.keys(selectedRequest.metadata).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Metadata</h3>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(selectedRequest.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
