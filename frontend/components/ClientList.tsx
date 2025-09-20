import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, User, Phone, Mail, Instagram, MessageCircle } from 'lucide-react';
import backend from '~backend/client';
import type { Client } from '~backend/client/list';

interface ClientListProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

export default function ClientList({ onNavigate }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const clientsPerPage = 10;

  // Pobierz klientów z API
  useEffect(() => {
    fetchClients();
  }, [currentPage]);

  // Real-time search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
          client.firstName.toLowerCase().includes(searchLower) ||
          client.lastName.toLowerCase().includes(searchLower) ||
          (client.phone && client.phone.includes(searchTerm)) ||
          (client.email && client.email.toLowerCase().includes(searchLower)) ||
          (client.instagram && client.instagram.toLowerCase().includes(searchLower))
        );
      });
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await backend.client.list();
      setClients(response.clients || []);
      setFilteredClients(response.clients || []);
      
      // Oblicz paginację
      const total = response.clients?.length || 0;
      setTotalPages(Math.ceil(total / clientsPerPage));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Paginacja
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Ładowanie klientów...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Klienci</h1>
            <p className="text-muted-foreground mt-2">
              {filteredClients.length} klientów
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate('menu')}>
            ← Menu główne
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Szukaj po imieniu, nazwisku, telefonie, email, Instagram..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paginatedClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {client.firstName} {client.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  {client.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {client.email}
                    </div>
                  )}
                  {client.instagram && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Instagram className="h-4 w-4 mr-2" />
                      @{client.instagram}
                    </div>
                  )}
                  {client.messenger && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {client.messenger}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {/* TODO: Open modal */}}
                  >
                    Zobacz więcej
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ← Poprzednia
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Strona {currentPage} z {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Następna →
            </Button>
          </div>
        )}

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Nie znaleziono klientów' : 'Brak klientów'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Spróbuj zmienić kryteria wyszukiwania'
                : 'Dodaj pierwszego klienta przez formularz wizyty'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}