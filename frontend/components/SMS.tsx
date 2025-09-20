import React, { useState, useEffect } from 'react';
import backend from '~backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, History, Edit3, Phone, User, Filter, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Client } from '~backend/client/list';
import type { SMSHistoryItem } from '~backend/sms/history';
import { useAppContext } from '../contexts/AppContext';

interface SMSProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function SMS({ onNavigate }: SMSProps) {
  const { toast } = useToast();
  const { refreshTrigger } = useAppContext();
  
  // State for SMS history and stats
  const [smsHistory, setSmsHistory] = useState<SMSHistoryItem[]>([]);
  const [smsStats, setSmsStats] = useState({
    totalSent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    totalCost: 0
  });
  const [loadingHistory, setLoadingHistory] = useState(true);

  // State for clients and manual SMS sending
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sending, setSending] = useState(false);

  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Templates (these could be fetched from backend or AI service)
  const templates = {
    SMS_D2: "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
    SMS_D1: "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}",
    SMS_D0: "To dziś, {IMIE}! {GODZ} w {STUDIO}",
    SMS_AFTER_TATTOO: "Dzięki za wizytę {IMIE}! Pamiętaj o pielęgnacji tatuażu. 3 razy dziennie smaruj poleconym kremem, regularnie przemywaj tatuaż, unikaj słońca i kąpieli w zbiornikach wodnych. Zrezygnuj przez następne kilka dni z intensywnego wysiłku fizycznego. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
    SMS_AFTER_PIERCING: "Dzięki za wizytę {IMIE}! Pielęgnacja piercingu: sól morska 2×/dzień, bez basenu/sauny przez 6 tygodni. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
    SMS_DEPOSIT_BEFORE: "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}",
    SMS_DEPOSIT_AFTER: "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}"
  };

  const templateNames = {
    SMS_D2: "SMS 2 dni przed wizytą",
    SMS_D1: "SMS 1 dzień przed wizytą", 
    SMS_D0: "SMS w dzień wizyty",
    SMS_AFTER_TATTOO: "SMS po tatuażu",
    SMS_AFTER_PIERCING: "SMS po piercingu",
    SMS_DEPOSIT_BEFORE: "SMS przed terminem zadatku",
    SMS_DEPOSIT_AFTER: "SMS po terminie zadatku"
  };

  // Load data on component mount and when refresh is triggered
  useEffect(() => {
    console.log('🔄 SMS useEffect wywołany z refreshTrigger:', refreshTrigger);
    loadSMSHistory();
    loadClients();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadSMSHistory();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Load SMS history with filters
  const loadSMSHistory = async () => {
    try {
      const response = await backend.sms.getSMSHistory();
      setSmsHistory(response.history);
      setSmsStats(response.stats);
    } catch (error) {
      console.error('Error loading SMS history:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historii SMS",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load clients for manual SMS sending
  const loadClients = async () => {
    try {
      console.log('📋 SMS: Ładuję klientów...');
      const response = await backend.client.list();
      console.log('✅ SMS: Klienci załadowani:', response.clients.length, 'klientów');
      setClients(response.clients);
    } catch (error) {
      console.error('❌ SMS: Error loading clients:', error);
    }
  };

  // Handle manual SMS sending
  const handleSendSMS = async () => {
    if (!manualPhone && !selectedClient) {
      toast({
        title: "Błąd",
        description: "Wybierz klienta lub wprowadź numer telefonu",
        variant: "destructive"
      });
      return;
    }

    if (!manualMessage) {
      toast({
        title: "Błąd", 
        description: "Wprowadź treść wiadomości",
        variant: "destructive"
      });
      return;
    }

    setSending(true);

    try {
      const selectedClientData = clients.find(c => c.id.toString() === selectedClient);
      const phoneToUse = manualPhone || selectedClientData?.phone || '';
      const clientName = selectedClientData ? `${selectedClientData.firstName} ${selectedClientData.lastName}` : '';

      if (!phoneToUse) {
        throw new Error('Brak numeru telefonu');
      }

      const response = await backend.sms.sendSMS({
        phone: phoneToUse,
        message: manualMessage,
        clientName: clientName,
        templateType: selectedTemplate || 'manual'
      });

      if (response.success) {
        toast({
          title: "SMS wysłany",
          description: response.message
        });
        
        // Clear form
        setManualPhone('');
        setManualMessage('');
        setSelectedClient('');
        setSelectedTemplate('');
        
        // Refresh history
        loadSMSHistory();
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Błąd wysyłania SMS",
        description: error instanceof Error ? error.message : "Nieznany błąd",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  // Apply template to message
  const applyTemplate = (templateKey: string) => {
    const template = templates[templateKey as keyof typeof templates];
    if (template) {
      setManualMessage(template);
      setSelectedTemplate(templateKey);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Wysłany</Badge>;
      case 'failed':
        return <Badge variant="destructive">Błąd</Badge>;
      case 'queued':
      case 'pending':
        return <Badge variant="secondary">Oczekuje</Badge>;
      default:
        return <Badge variant="outline">Nieznany</Badge>;
    }
  };

  // Filter SMS history
  const filteredHistory = smsHistory.filter(sms => {
    if (statusFilter !== 'all' && sms.status !== statusFilter) return false;
    if (templateFilter !== 'all' && sms.templateType !== templateFilter) return false;
    
    if (dateFilter !== 'all') {
      const smsDate = new Date(sms.sentAt);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          return smsDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return smsDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return smsDate >= monthAgo;
      }
    }
    
    return true;
  });

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 border rounded-lg animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
          </div>
          <div className="h-4 bg-muted rounded w-full mb-1"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSMSHistory} disabled={loadingHistory}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
            <Button variant="outline" onClick={() => onNavigate('menu')}>
              ← Menu główne
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Manual SMS Sending */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Wyślij SMS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Klient</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz klienta" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {client.firstName} {client.lastName}
                            {client.phone && (
                              <span className="text-muted-foreground">({client.phone})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lub wprowadź numer telefonu</Label>
                  <Input
                    placeholder="+48123456789"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    disabled={!!selectedClient}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Szablon (opcjonalnie)</Label>
                  <Select value={selectedTemplate} onValueChange={(value) => applyTemplate(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz szablon" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templateNames).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Treść wiadomości</Label>
                  <Textarea
                    placeholder="Wprowadź treść SMS..."
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    rows={4}
                  />
                  <div className="text-xs text-muted-foreground">
                    Znaki: {manualMessage.length}/160
                  </div>
                </div>

                <Button 
                  onClick={handleSendSMS} 
                  disabled={sending || (!manualPhone && !selectedClient) || !manualMessage}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Wyślij SMS
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Statystyki SMS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Wszystkich</p>
                    <p className="text-2xl font-bold">{smsStats.totalSent}</p>
                  </div>
                  <div>
                    <p className="font-medium">Wysłanych</p>
                    <p className="text-2xl font-bold text-green-600">{smsStats.delivered}</p>
                  </div>
                  <div>
                    <p className="font-medium">Błędów</p>
                    <p className="text-2xl font-bold text-red-600">{smsStats.failed}</p>
                  </div>
                  <div>
                    <p className="font-medium">Oczekuje</p>
                    <p className="text-2xl font-bold text-yellow-600">{smsStats.pending}</p>
                  </div>
                </div>
                {smsStats.totalCost > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium">Całkowity koszt</p>
                    <p className="text-lg font-bold">{smsStats.totalCost.toFixed(2)} pkt</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SMS History */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historia SMS ({filteredHistory.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Filtry:</span>
                  </div>
                </div>
                
                {/* Filters */}
                <div className="flex gap-4 mt-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="sent">Wysłane</SelectItem>
                      <SelectItem value="failed">Błędy</SelectItem>
                      <SelectItem value="queued">Oczekuje</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie szablony</SelectItem>
                      {Object.entries(templateNames).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">Ręczne</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="today">Dziś</SelectItem>
                      <SelectItem value="week">Tydzień</SelectItem>
                      <SelectItem value="month">Miesiąc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {loadingHistory ? (
                  <SkeletonLoader />
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Brak SMS-ów do wyświetlenia</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredHistory.map((sms) => (
                      <div key={sms.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Phone className="h-4 w-4" />
                            {sms.phone}
                            {sms.clientName && (
                              <span className="text-muted-foreground">
                                ({sms.clientName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(sms.status)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(sms.sentAt).toLocaleString('pl-PL')}
                            </span>
                          </div>
                        </div>
                        
                        {sms.templateType && sms.templateType !== 'manual' && (
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs">
                              {templateNames[sms.templateType as keyof typeof templateNames] || sms.templateType}
                            </Badge>
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground">
                          {sms.message.length > 120 ? sms.message.substring(0, 120) + '...' : sms.message}
                        </p>
                        
                        {sms.cost && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Koszt: {sms.cost} pkt
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cron Jobs Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Status automatycznych SMS-ów
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Przypomnienia o wizytach</p>
                  <p className="text-muted-foreground">Codziennie 09:00</p>
                  <Badge variant="outline" className="mt-2">Aktywne</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Przypomnienia o zadatkach</p>
                  <p className="text-muted-foreground">Codziennie 10:00</p>
                  <Badge variant="outline" className="mt-2">Aktywne</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">SMS po zabiegu</p>
                  <p className="text-muted-foreground">Codziennie 11:00</p>
                  <Badge variant="outline" className="mt-2">Aktywne</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Odświeżanie statusu</p>
                  <p className="text-muted-foreground">Poniedziałki 07:00</p>
                  <Badge variant="outline" className="mt-2">Aktywne</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}