import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, History, Edit3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SMSProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function SMS({ onNavigate }: SMSProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const [templates, setTemplates] = useState({
    SMS_D2: "Cześć {IMIE}! Wizyta {DATA} o {GODZ} w {STUDIO} – widzimy się pojutrze",
    SMS_D1: "Hej {IMIE}! Jutro {DATA} o {GODZ} w {STUDIO}.",
    SMS_D0: "To dziś, {IMIE}! {GODZ} w {STUDIO}.",
    SMS_AFTER_TATTOO: "Dzięki za wizytę {IMIE}! Pamiętaj o pielęgnacji tatuażu. 3 razy dziennie smaruj poleconym kremem, regularnie przemywaj tatuaż, unikaj słońca i kąpieli w zbiornikach wodnych. Zrezygnuj przez następne kilka dni z intensywnego wysiłku fizycznego. W razie pytań jesteśmy do dyspozycji! ({STUDIO})",
    SMS_AFTER_PIERCING: "Dzięki {IMIE}! Pielęgnacja piercingu: sól 2×/dzień, bez basenu/sauny. ({STUDIO})",
    SMS_DEPOSIT_BEFORE: "Prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}.",
    SMS_DEPOSIT_AFTER: "{IMIE}, prosimy o zadatek {KWOTA}zł za wizytę {DATA} {GODZ} w {STUDIO}."
  });

  const templateNames = {
    SMS_D2: "SMS 2 dni przed wizytą",
    SMS_D1: "SMS 1 dzień przed wizytą", 
    SMS_D0: "SMS w dzień wizyty",
    SMS_AFTER_TATTOO: "SMS po tatuażu",
    SMS_AFTER_PIERCING: "SMS po piercingu",
    SMS_DEPOSIT_BEFORE: "SMS przed terminem zadatku",
    SMS_DEPOSIT_AFTER: "SMS po terminie zadatku"
  };

  const smsHistory = [
    { id: 1, phone: "123456789", message: "Cześć Anna! Wizyta 15.12 o 14:00...", sent: "2024-12-14 10:00", status: "delivered" },
    { id: 2, phone: "987654321", message: "Hej Piotr! Jutro 14.12 o 16:30...", sent: "2024-12-13 09:30", status: "delivered" },
    { id: 3, phone: "555123456", message: "To dziś, Kasia! 13:00 w Studio...", sent: "2024-12-12 08:00", status: "failed" }
  ];

  const handleSaveTemplate = (templateId: string, newContent: string) => {
    setTemplates(prev => ({ ...prev, [templateId]: newContent }));
    setEditingTemplate(null);
    toast({
      title: "Szablon zapisany",
      description: "Zmiany w szablonie zostały zapisane."
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Dostarczony</Badge>;
      case 'failed':
        return <Badge variant="destructive">Błąd</Badge>;
      case 'pending':
        return <Badge variant="secondary">Oczekuje</Badge>;
      default:
        return <Badge variant="outline">Nieznany</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS
          </h1>
          <Button variant="outline" onClick={() => onNavigate('menu')}>
            ← Menu główne
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Templates Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Szablony SMS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(templates).map(([templateId, content]) => (
                  <div key={templateId} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">
                        {templateNames[templateId as keyof typeof templateNames]}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(templateId)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {editingTemplate === templateId ? (
                      <div className="space-y-2">
                        <Textarea
                          value={content}
                          onChange={(e) => setTemplates(prev => ({ ...prev, [templateId]: e.target.value }))}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveTemplate(templateId, content)}>
                            Zapisz
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {content.length > 100 ? content.substring(0, 100) + '...' : content}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zmienne w szablonach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><code className="bg-muted px-1 rounded">{'{IMIE}'}</code> - Imię klienta</div>
                  <div><code className="bg-muted px-1 rounded">{'{DATA}'}</code> - Data wizyty</div>
                  <div><code className="bg-muted px-1 rounded">{'{GODZ}'}</code> - Godzina wizyty</div>
                  <div><code className="bg-muted px-1 rounded">{'{STUDIO}'}</code> - Nazwa studia</div>
                  <div><code className="bg-muted px-1 rounded">{'{KWOTA}'}</code> - Kwota zadatku</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historia SMS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {smsHistory.map((sms) => (
                  <div key={sms.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">
                        📱 {sms.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sms.status)}
                        <span className="text-xs text-muted-foreground">
                          {sms.sent}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sms.message}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statystyki SMS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Wysłane dziś</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <div>
                    <p className="font-medium">Dostarczonych</p>
                    <p className="text-2xl font-bold text-green-600">11</p>
                  </div>
                  <div>
                    <p className="font-medium">Błędów</p>
                    <p className="text-2xl font-bold text-red-600">1</p>
                  </div>
                  <div>
                    <p className="font-medium">Pozostało SMS</p>
                    <p className="text-2xl font-bold">245</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            ℹ️ SMS-y są wysyłane automatycznie według harmonogramu. Nie ma możliwości ręcznego wysyłania SMS-ów.
          </p>
        </div>
      </div>
    </div>
  );
}