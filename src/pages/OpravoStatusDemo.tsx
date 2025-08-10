import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import OpravoStatus from '@/components/OpravoStatus';
import OpravoStatusTests from '@/components/OpravoStatusTests';

export default function OpravoStatusDemo() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Opravo Status Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Stabilizované monitorování Opravo API s bezpečnostními vylepšeními a testováním
        </p>
      </div>

      {/* Status Components Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            1. UI Komponenty - Vyčištěno a Stabilizováno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Kompaktní verze s tooltipem</h3>
            <OpravoStatus compact projectId="opravo-demo" />
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-medium mb-3">Plná verze s akcemi</h3>
            <OpravoStatus projectId="opravo-demo" />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="font-medium">Klíčové funkce</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Badge "Připojeno/Odpojeno" s tooltipem obsahujícím relativní čas</li>
              <li>• Tlačítko "Znovu ověřit" pro manuální kontrolu</li>
              <li>• Automatický polling každých 60s s exponential backoff při chybách</li>
              <li>• Respektování globálního výběru projektu</li>
              <li>• Žádné API klíče na frontendu - vše zabezpečeno v edge functions</li>
              <li>• Cleanup intervalů při unmount</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Security Improvements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            2. Bezpečnostní Vylepšení
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-green-700 dark:text-green-300">✅ Implementováno</h3>
              <ul className="text-sm space-y-1">
                <li>• Unifikace autorizace - pouze <code className="bg-muted px-1 rounded text-xs">x-sofinity-key</code></li>
                <li>• CORS jen z povolených originů</li>
                <li>• Timeout 5s pro všechny operace</li>
                <li>• Strukturované logy (severity, latency, result)</li>
                <li>• Rate limiting 60 req/min per IP</li>
                <li>• Exponential backoff při chybách</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-700 dark:text-blue-300">🔧 Konfigurace</h3>
              <div className="text-sm space-y-1">
                <div>Endpoint: <code className="bg-muted px-1 rounded text-xs">/functions/v1/opravo-status</code></div>
                <div>Auth: <code className="bg-muted px-1 rounded text-xs">x-sofinity-key: ${'{'}SOFINITY_API_KEY{'}'}</code></div>
                <div>Rate limit: <Badge variant="outline">60/min</Badge></div>
                <div>Timeout: <Badge variant="outline">5s</Badge></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            3. Testovací Scénáře
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Automatizované testování pro ověření správného chování při různých stavech:
          </p>
          <OpravoStatusTests />
        </CardContent>
      </Card>

      {/* Implementation Notes */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-3">
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                Implementační poznámky
              </h3>
              <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                <p>
                  <strong>UI rozhodování:</strong> Komponenty rozhodují výlučně na základě pole 
                  <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded mx-1">isConnected</code> 
                  z API odpovědi, ne podle HTTP status kódu.
                </p>
                <p>
                  <strong>Audit logy:</strong> Všechny požadavky se automaticky logují do Supabase 
                  s detaily o latenci, výsledku a klientské IP pro monitoring a debugging.
                </p>
                <p>
                  <strong>Projekt kontext:</strong> Status je ukládán per-projekt do localStorage 
                  s automatickým cleanupem starých záznamů.
                </p>
                <p>
                  <strong>Error handling:</strong> Implementován exponential backoff s maximálním 
                  intervalem 8 minut při opakovaných chybách.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}