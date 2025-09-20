import React, { useState, useEffect, useMemo } from 'react';
import backend from '~backend/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, User, Phone, Mail, Instagram, MessageCircle, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { Client } from '~backend/client/list';
import ClientDetailModal from './ClientDetailModal';
import { useAppContext } from '../contexts/AppContext';

interface ClientListProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

type ClientStatus = 'nowy' | 'aktywny' | 'nieaktywny' | 'zbanowany';
type SortField = 'lastName' | 'firstName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function ClientList({ onNavigate }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useAppContext();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const clientsPerPage = 12;

  useEffect(() => {
    console.log('🔄 ClientList useEffect wywołany z refreshTrigger:', refreshTrigger);
    loadClients();
  }, [refreshTrigger]);

  const polishCollation = (str: string) => {
    return str
      .toLowerCase()
      .replace(/ą/g, 'a')
      .replace(/ć/g, 'c')
      .replace(/ę/g, 'e')
      .replace(/ł/g, 'l')
      .replace(/ń/g, 'n')
      .replace(/ó/g, 'o')
      .replace(/ś/g, 's')
      .replace(/ź/g, 'z')
      .replace(/ż/g, 'z');
  };

  const getClientStatus = (client: Client): ClientStatus => {
    const now = new Date();
    const createdAt = new Date(client.createdAt);
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreation <= 30) {
      return 'nowy';
    } else if (daysSinceCreation <= 90) {
      return 'aktywny';
    } else {
      return 'nieaktywny';
    }
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'nowy': return 'bg-blue-100 text-blue-800';
      case 'aktywny': return 'bg-green-100 text-green-800';
      case 'nieaktywny': return 'bg-yellow-100 text-yellow-800';
      case 'zbanowany': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ClientStatus) => {
    switch (status) {
      case 'nowy': return 'Nowy';
      case 'aktywny': return 'Aktywny';
      case 'nieaktywny': return 'Nieaktywny';
      case 'zbanowany': return 'Zbanowany';
      default: return status;
    }
  };

  const processedClients = useMemo(() => {
    let filtered = clients;

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.firstName.toLowerCase().includes(searchLower) ||
        client.lastName.toLowerCase().includes(searchLower) ||
        (client.phone && client.phone.includes(searchTerm)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.instagram && client.instagram.toLowerCase().includes(searchLower))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => getClientStatus(client) === statusFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'lastName':
          comparison = polishCollation(a.lastName).localeCompare(polishCollation(b.lastName));
          if (comparison === 0) {
            comparison = polishCollation(a.firstName).localeCompare(polishCollation(b.firstName));
          }
          break;
        case 'firstName':
          comparison = polishCollation(a.firstName).localeCompare(polishCollation(b.firstName));
          if (comparison === 0) {
            comparison = polishCollation(a.lastName).localeCompare(polishCollation(b.lastName));
          }
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchTerm, statusFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(processedClients.length / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const paginatedClients = processedClients.slice(startIndex, startIndex + clientsPerPage);

  const statusCounts = useMemo(() => {
    const counts = { nowy: 0, aktywny: 0, nieaktywny: 0, zbanowany: 0 };
    clients.forEach(client => {
      const status = getClientStatus(client);
      counts[status]++;
    });
    return counts;
  }, [clients]);

  const loadClients = async () => {
    try {
      console.log('📋 Ładuję klientów...');
      const response = await backend.client.list();
      console.log('✅ Klienci załadowani:', response.clients.length, 'klientów');
      setClients(response.clients);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const openModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };



  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField('lastName');
    setSortDirection('asc');
    setCurrentPage(1);
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
    <>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">📋 Klienci ({clients.length})</h1>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onNavigate('menu')} className="text-sm">
                ← Menu
              </Button>
              <Button variant="outline" onClick={() => onNavigate('form')} className="text-sm">
                + Wizyta
              </Button>
              <Button variant="outline" onClick={() => onNavigate('list')} className="text-sm">
                Wizyty
              </Button>
              <Button variant="outline" onClick={() => onNavigate('calendar')} className="text-sm">
                Kalendarz
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-blue-100 text-blue-800">
                🆕 Nowi: {statusCounts.nowy}
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                ✅ Aktywni: {statusCounts.aktywny}
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800">
                ⏸️ Nieaktywni: {statusCounts.nieaktywny}
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                🚫 Zbanowani: {statusCounts.zbanowany}
              </Badge>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Filtry i wyszukiwanie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Szukaj po imieniu, nazwisku, telefonie, email, Instagram..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value: ClientStatus | 'all') => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="nowy">Nowi</SelectItem>
                      <SelectItem value="aktywny">Aktywni</SelectItem>
                      <SelectItem value="nieaktywny">Nieaktywni</SelectItem>
                      <SelectItem value="zbanowany">Zbanowani</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={resetFilters}>
                    Wyczyść
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lista klientów ({processedClients.length})</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('lastName')}
                    className="flex items-center gap-1"
                  >
                    Nazwisko {getSortIcon('lastName')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('firstName')}
                    className="flex items-center gap-1"
                  >
                    Imię {getSortIcon('firstName')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-1"
                  >
                    Data {getSortIcon('createdAt')}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Brak klientów spełniających kryteria wyszukiwania'
                      : 'Brak klientów w bazie danych'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedClients.map((client) => {
                      const status = getClientStatus(client);
                      return (
                        <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm">
                                  {client.firstName} {client.lastName}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  ID: {client.id}
                                </p>
                              </div>
                              <Badge className={`text-xs ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                              </Badge>
                            </div>

                            <div className="space-y-2 mb-3">
                              {client.phone && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{client.phone}</span>
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{client.email}</span>
                                </div>
                              )}
                              {client.instagram && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Instagram className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">@{client.instagram}</span>
                                </div>
                              )}
                              {!client.phone && !client.email && !client.instagram && (
                                <p className="text-xs text-muted-foreground italic">
                                  Brak danych kontaktowych
                                </p>
                              )}
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(client.createdAt)}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openModal(client)}
                                className="h-7 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Zobacz
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Wyświetlane {startIndex + 1}-{Math.min(startIndex + clientsPerPage, processedClients.length)} z {processedClients.length} klientów
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ClientDetailModal
        client={selectedClient}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}