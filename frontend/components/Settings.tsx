import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Bell, Building } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SettingsProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState('Studio Tatuażu');
  const [notifications, setNotifications] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleSave = () => {
    // Simulate saving settings
    toast({
      title: "Ustawienia zapisane",
      description: "Wszystkie zmiany zostały pomyślnie zapisane."
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Ustawienia
          </h1>
          <Button variant="outline" onClick={() => onNavigate('menu')}>
            ← Menu główne
          </Button>
        </div>

        <div className="space-y-6">
          
          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dane biznesu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nazwa biznesu</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Wpisz nazwę swojego studia"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Ta nazwa będzie używana w SMS-ach i dokumentach
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Powiadomienia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Powiadomienia systemowe</Label>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj powiadomienia o nowych wizytach i zmianach
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatyczne SMS-y</Label>
                  <p className="text-sm text-muted-foreground">
                    Wysyłaj automatyczne przypomnienia do klientów
                  </p>
                </div>
                <Switch
                  checked={smsReminders}
                  onCheckedChange={setSmsReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Powiadomienia email</Label>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj powiadomienia na adres email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
            </CardContent>
          </Card>

          {/* SMS Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Harmonogram przypomnień:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 2 dni przed wizytą</li>
                    <li>• 1 dzień przed wizytą</li>
                    <li>• W dzień wizyty</li>
                    <li>• Instrukcje pousługowe</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Przypomnienia o zadatkach:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Dzień przed terminem</li>
                    <li>• 3 dni po terminie</li>
                  </ul>
                </div>
              </div>
              
              <Button variant="outline" onClick={() => onNavigate('sms')}>
                Zarządzaj szablonami SMS
              </Button>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacje o systemie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Wersja systemu</p>
                  <p className="text-muted-foreground">1.0.0</p>
                </div>
                <div>
                  <p className="font-medium">Typ konta</p>
                  <p className="text-muted-foreground">Studio Tatuażu</p>
                </div>
                <div>
                  <p className="font-medium">Ostatnia aktualizacja</p>
                  <p className="text-muted-foreground">Dziś</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Zapisz ustawienia
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}