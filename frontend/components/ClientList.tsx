import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, User, Phone, Mail, Instagram, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import backend from '~backend/client';
import type { Client } from '~backend/client/list';
import ClientDetailModal from './ClientDetailModal';

interface ClientListProps {
  onNavigate: (view: 'menu' | 'form' | 'list' | 'clients' | 'calendar' | 'settings' | 'sms' | 'payments' | 'history') => void;
}

type ClientStatus = 'nowy' | 'aktywny' | 'nieaktywny' | 'zbanowany';
type SortField = 'lastName' | 'firstName' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function ClientList({ onNavigate }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const clientsPerPage = 10;

  // Modal state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'lastName',
    direction: 'asc'
  });

  // Pobierz klientów z API
  useEffect(() => {
    fetchClients();
  }, [currentPage]);

  // Polish collation function
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

  // Enhanced business logic for determining client status
  const getClientStatus = (client: Client): ClientStatus => {
    const now = new Date();
    const clientCreatedAt = new Date(client.createdAt);
    const daysSinceCreation = Math.floor((now.getTime() - clientCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Find client's events to determine activity
    const clientEvents = clients.length > 0 ? [] : []; // Will be populated when we have events data
    
    // Status logic:
    // 1. Nowy: Client created within last 30 days and has 0-1 visits
    // 2. Aktywny: Client has visits within last 90 days
    // 3. Nieaktywny: Client has no visits in last 90+ days but has some visits
    // 4. Zbanowany: Manual override (would need to be stored in DB)
    
    // For now, simplified logic based on creation date
    if (daysSinceCreation <= 30) {
      return 'nowy';
    } else if (daysSinceCreation <= 90) {
      return 'aktywny';
    } else {
      return 'nieaktywny';
    }
    
    // TODO: Implement full logic when event data is integrated:
    // - Check last visit date
    // - Count total visits
    // - Check payment history
    // - Check for manual status override in client record
  };

  // Sort clients with Polish collation
  const sortClients = (clients: Client[], config: SortConfig): Client[] => {
    return [...clients].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (config.field) {
        case 'lastName':
          aValue = a.lastName || '';
          bValue = b.lastName || '';
          break;
        case 'firstName':
          aValue = a.firstName || '';
          bValue = b.firstName || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).toISOString();
          bValue = new Date(b.createdAt).toISOString();
          break;
        default:
          return 0;
      }

      // Apply Polish collation
      const aCollated = polishCollation(aValue);
      const bCollated = polishCollation(bValue);

      let comparison = 0;
      if (aCollated < bCollated) {
        comparison = -1;
      } else if (aCollated > bCollated) {
        comparison = 1;
      }

      // Tie-breaker: if last names are equal, sort by first name
      if (comparison === 0 && config.field === 'lastName') {
        const aFirstName = polishCollation(a.firstName || '');
        const bFirstName = polishCollation(b.firstName || '');
        if (aFirstName < bFirstName) {
          comparison = -1;
        } else if (aFirstName > bFirstName) {
          comparison = 1;
        }
      }

      return config.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Filter and sort clients
  const processedClients = useMemo(() => {
    let filtered = clients;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        return (
          client.firstName.toLowerCase().includes(searchLower) ||
          client.lastName.toLowerCase().includes(searchLower) ||
          (client.phone && client.phone.includes(searchTerm)) ||
          (client.email && client.email.toLowerCase().includes(searchLower)) ||
          (client.instagram && client.instagram.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => getClientStatus(client) === statusFilter);
    }

    // Apply sorting
    return sortClients(filtered, sortConfig);
  }, [clients, searchTerm, statusFilter, sortConfig]);

  // Update filtered clients when processed clients change
  useEffect(() => {
    setFilteredClients(processedClients);
    
    // Recalculate pagination
    const total = processedClients.length;
    setTotalPages(Math.ceil(total / clientsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [processedClients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await backend.client.list();
      setClients(response.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modal functions
  const openModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  const handleClientUpdate = (updatedClient: Client) => {
    // Update client in the list
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      )
    );
  };



  // Sort functions
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        // Toggle direction if same field
        return {
          field,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // New field, default to ascending
        return {
          field,
          direction: 'asc'
        };
      }
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
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

  // Pagination
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
    <>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Status Counters */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Klienci</h1>
              <p className="text-muted-foreground mt-2">
                {filteredClients.length} klientów
                {statusFilter !== 'all' && ` (${getStatusLabel(statusFilter as ClientStatus)})`}
              </p>
              
              {/* Status Counters */}
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Nowy: {clients.filter(c => getClientStatus(c) === 'nowy').length}
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Aktywny: {clients.filter(c => getClientStatus(c) === 'aktywny').length}
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  Nieaktywny: {clients.filter(c => getClientStatus(c) === 'nieaktywny').length}
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  Zbanowany: {clients.filter(c => getClientStatus(c) === 'zbanowany').length}
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={() => onNavigate('menu')}>
              ← Menu główne
            </Button>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Szukaj po imieniu, nazwisku, telefonie, email, Instagram..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ClientStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtruj status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy klienci ({clients.length})</SelectItem>
                    <SelectItem value="nowy">
                      🆕 Nowy ({clients.filter(c => getClientStatus(c) === 'nowy').length})
                    </SelectItem>
                    <SelectItem value="aktywny">
                      ✅ Aktywny ({clients.filter(c => getClientStatus(c) === 'aktywny').length})
                    </SelectItem>
                    <SelectItem value="nieaktywny">
                      ⏸️ Nieaktywny ({clients.filter(c => getClientStatus(c) === 'nieaktywny').length})
                    </SelectItem>
                    <SelectItem value="zbanowany">
                      🚫 Zbanowany ({clients.filter(c => getClientStatus(c) === 'zbanowany').length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Sortuj:</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('lastName')}
                  className="flex items-center gap-1"
                >
                  Nazwisko {getSortIcon('lastName')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('firstName')}
                  className="flex items-center gap-1"
                >
                  Imię {getSortIcon('firstName')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center gap-1"
                >
                  Data dodania {getSortIcon('createdAt')}
                </Button>
              </div>
            </div>
          </div>

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedClients.map((client) => {
              const status = getClientStatus(client);
              return (
                <Card key={client.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {client.firstName} {client.lastName}
                        </CardTitle>
                        <Badge className={getStatusColor(status)}>
                          {getStatusLabel(status)}
                        </Badge>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>Dodano: {new Date(client.createdAt).toLocaleDateString('pl-PL')}</div>
                        <div>Przez: {client.createdBy}</div>
                      </div>
                    </div>
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
                      {client.birthDate && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="h-4 w-4 mr-2" />
                          Ur. {new Date(client.birthDate).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openModal(client)}
                      >
                        Zobacz więcej
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                {searchTerm || statusFilter !== 'all' ? 'Nie znaleziono klientów' : 'Brak klientów'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                  : 'Dodaj pierwszego klienta przez formularz wizyty'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <ClientDetailModal
        client={selectedClient}
        isOpen={isModalOpen}
        onClose={closeModal}
        onClientUpdate={handleClientUpdate}
      />
    </>
  );
}