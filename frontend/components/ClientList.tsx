import React, { useState, useEffect } from 'react';
import backend from '~backend/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { Client } from '~backend/client/list';

interface ClientListProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function ClientList({ onNavigate }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      const response = await backend.client.list();
      setClients(response.clients);
      setFilteredClients(response.clients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Ładowanie klientów...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Klienci</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate('menu')}>
              ← Menu główne
            </Button>
            <Button variant="outline" onClick={() => onNavigate('form')}>
              Dodaj wizytę
            </Button>
            <Button variant="outline" onClick={() => onNavigate('list')}>
              Zobacz wizyty
            </Button>
            <Button variant="outline" onClick={() => onNavigate('calendar')}>
              Kalendarz
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Wyszukaj po imieniu i nazwisku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nie znaleziono klientów pasujących do wyszukiwania' : 'Brak klientów w systemie'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      📁 {client.firstName} {client.lastName}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Klient: {client.createdBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dodano: {formatDate(client.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Dane osobowe</h4>
                      {client.birthDate && (
                        <p className="text-sm">🎂 {formatDate(client.birthDate)}</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Kontakt</h4>
                      {client.phone && <p className="text-sm">📞 {client.phone}</p>}
                      {client.email && <p className="text-sm">✉️ {client.email}</p>}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Social Media</h4>
                      {client.instagram && <p className="text-sm">📱 {client.instagram}</p>}
                      {client.messenger && <p className="text-sm">💬 {client.messenger}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            📊 Łącznie klientów: {clients.length} | Wyświetlanych: {filteredClients.length}
          </p>
        </div>
      </div>
    </div>
  );
}