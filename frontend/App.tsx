import React, { useState } from 'react';
import backend from '~backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import EventList from './components/EventList';
import ClientList from './components/ClientList';
import Calendar from './components/Calendar';
import MainMenu from './components/MainMenu';
import History from './components/History';
import Payments from './components/Payments';
import Settings from './components/Settings';
import SMS from './components/SMS';

export default function App() {
  const [currentView, setCurrentView] = useState<'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history'>('menu');
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    phone: '',
    instagram: '',
    messenger: '',
    email: '',
    eventTime: '',
    service: '',
    price: '',
    depositAmount: '',
    depositDueDate: '',
    depositStatus: 'nie dotyczy' as const,
    durationMinutes: '',
    notes: '',
    createdBy: 'Admin'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await backend.event.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate || undefined,
        phone: formData.phone || undefined,
        instagram: formData.instagram || undefined,
        messenger: formData.messenger || undefined,
        email: formData.email || undefined,
        eventTime: formData.eventTime,
        service: formData.service,
        price: parseFloat(formData.price),
        depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
        depositDueDate: formData.depositDueDate || undefined,
        depositStatus: formData.depositStatus,
        durationMinutes: parseInt(formData.durationMinutes),
        notes: formData.notes || undefined,
        createdBy: formData.createdBy
      });

      toast({
        title: "Sukces",
        description: "Wizyta została dodana pomyślnie"
      });
      
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '',
        phone: '',
        instagram: '',
        messenger: '',
        email: '',
        eventTime: '',
        service: '',
        price: '',
        depositAmount: '',
        depositDueDate: '',
        depositStatus: 'nie dotyczy',
        durationMinutes: '',
        notes: '',
        createdBy: 'Admin'
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać wizyty",
        variant: "destructive"
      });
    }
  };

  if (currentView === 'menu') {
    return (
      <>
        <MainMenu onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'list') {
    return (
      <>
        <EventList onBackToForm={() => setCurrentView('form')} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'clients') {
    return (
      <>
        <ClientList onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'calendar') {
    return (
      <>
        <Calendar onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'history') {
    return (
      <>
        <History onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'payments') {
    return (
      <>
        <Payments onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'settings') {
    return (
      <>
        <Settings onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'sms') {
    return (
      <>
        <SMS onNavigate={setCurrentView} />
        <Toaster />
      </>
    );
  }

  if (currentView === 'form') {
    return (
      <>
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dodaj wizytę</h1>
          <Button variant="outline" onClick={() => setCurrentView('menu')}>
            ← Menu główne
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Imię *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="birthDate">Data urodzenia</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="messenger">Messenger</Label>
              <Input
                id="messenger"
                value={formData.messenger}
                onChange={(e) => setFormData({...formData, messenger: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="eventTime">Data i godzina wizyty *</Label>
            <Input
              id="eventTime"
              type="datetime-local"
              value={formData.eventTime}
              onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="service">Usługa *</Label>
            <Input
              id="service"
              value={formData.service}
              onChange={(e) => setFormData({...formData, service: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Cena *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="durationMinutes">Czas trwania (min) *</Label>
              <Input
                id="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="depositAmount">Kwota zaliczki</Label>
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="depositDueDate">Termin płatności zaliczki</Label>
              <Input
                id="depositDueDate"
                type="date"
                value={formData.depositDueDate}
                onChange={(e) => setFormData({...formData, depositDueDate: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="depositStatus">Status zadatku</Label>
            <Select value={formData.depositStatus} onValueChange={(value) => setFormData({...formData, depositStatus: value as any})}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz status zadatku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nie dotyczy">Nie dotyczy</SelectItem>
                <SelectItem value="niezapłacony">Niezapłacony</SelectItem>
                <SelectItem value="zapłacony">Zapłacony</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notatki</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Dodatkowe informacje o wizycie..."
            />
          </div>

          <Button type="submit" className="w-full">
            Dodaj wizytę
          </Button>
        </form>
      </div>
    </div>
    <Toaster />
    </>
    );
  }

  // Default fallback
  return (
    <>
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Nieznany widok</h1>
          <Button onClick={() => setCurrentView('menu')}>← Wróć do menu</Button>
        </div>
      </div>
      <Toaster />
    </>
  );
}