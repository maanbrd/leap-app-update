import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentsProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function Payments({ onNavigate }: PaymentsProps) {
  const { toast } = useToast();
  const [smsBalance, setSmsBalance] = useState(0);

  const packages = [
    {
      id: 'basic',
      price: 50,
      sms: 100,
      pricePerSms: 0.50,
      popular: false
    },
    {
      id: 'standard',
      price: 100,
      sms: 300,
      pricePerSms: 0.33,
      popular: true
    },
    {
      id: 'premium',
      price: 200,
      sms: 700,
      pricePerSms: 0.29,
      popular: false
    }
  ];

  const handlePurchase = (packageData: typeof packages[0]) => {
    // Simulate purchase
    setSmsBalance(prev => prev + packageData.sms);
    
    toast({
      title: "Zakup zakończony!",
      description: `Dodano ${packageData.sms} SMS-ów do konta. Nowe saldo: ${smsBalance + packageData.sms} SMS-ów.`
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Płatności</h1>
          <Button variant="outline" onClick={() => onNavigate('menu')}>
            ← Menu główne
          </Button>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Twoje konto SMS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {smsBalance}
                </div>
                <p className="text-muted-foreground">Dostępnych SMS-ów</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Pakiety SMS</h2>
          <p className="text-muted-foreground">
            Wybierz pakiet SMS-ów do automatycznych przypomnień i komunikacji z klientami
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative ${pkg.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">Najpopularniejszy</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{pkg.price} zł</CardTitle>
                <p className="text-muted-foreground">{pkg.sms} SMS-ów</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {pkg.pricePerSms.toFixed(2)} zł za SMS
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Przypomnienia o wizytach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">SMS-y o zadatkach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Instrukcje pousługowe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Szablony wiadomości</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg)}
                >
                  Kup pakiet
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Informacje o SMS-ach</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p><strong>Przypomnienia o wizytach:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>SMS 2 dni przed wizytą</li>
                <li>SMS 1 dzień przed wizytą</li>
                <li>SMS w dzień wizyty</li>
                <li>SMS z instrukcjami pielęgnacji</li>
              </ul>
            </div>
            <div>
              <p><strong>Przypomnienia o zadatkach:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>SMS dzień przed terminem płatności</li>
                <li>SMS 3 dni po terminie</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}