import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, AlertCircle, Filter, Search, ArrowUpDown, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';

const API = `${process.env.REACT_APP_API_URL}/api`;

const SiteFilterCombobox = ({ sites, value, onChange }) => {
  const [open, setOpen] = useState(false);

  const selectedSite = sites.find((site) => site.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-gray-900 border-gray-700 text-gray-300"
          data-testid="site-filter-select"
        >
          {value && value !== 'all'
            ? selectedSite?.name
            : "All Sites"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-gray-900 border-gray-700">
        <Command className="bg-gray-900 border-gray-700">
          <CommandInput placeholder="Search site..." className="text-white" />
          <CommandList>
            <CommandEmpty className="text-gray-400">No site found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-sites"
                className="text-gray-200 data-[selected=true]:bg-gray-800"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === 'all' || !value ? "opacity-100" : "opacity-0"
                  )}
                />
                All Sites
              </CommandItem>
              {sites.map((site) => (
                <CommandItem
                  key={site.id}
                  value={site.name}
                  className="text-gray-200 data-[selected=true]:bg-gray-800"
                  onSelect={() => {
                    onChange(site.id === value ? 'all' : site.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === site.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {site.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

};

const SiteCreationCombobox = ({ sites, value, onChange }) => {
  const [open, setOpen] = useState(false);

  const selectedSite = sites.find((site) => site.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          data-testid="site-select-combobox"
        >
          {value
            ? selectedSite?.name
            : "Select site..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-gray-900 border-gray-700">
        <Command className="bg-gray-900 border-gray-700">
          <CommandInput placeholder="Search site..." className="text-white" />
          <CommandList>
            <CommandEmpty className="text-gray-400">No site found.</CommandEmpty>
            <CommandGroup>
              {sites.map((site) => (
                <CommandItem
                  key={site.id}
                  value={site.name}
                  className="text-gray-200 data-[selected=true]:bg-gray-800"
                  onSelect={() => {
                    onChange(site.id === value ? "" : site.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === site.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {site.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Tickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [siteFilter, setSiteFilter] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assigned_to_division: 'Monitoring',
    site_id: undefined
  });

  useEffect(() => {
    fetchTickets();
    fetchSites();
  }, []);

  useEffect(() => {
    if (siteFilter && siteFilter !== 'all') {
      fetchTickets(siteFilter);
    } else {
      fetchTickets();
    }
  }, [siteFilter]);

  const fetchTickets = async (site_id = '') => {
    try {
      const url = site_id ? `${API}/tickets?site_id=${site_id}` : `${API}/tickets`;
      const response = await axios.get(url);
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`);
      setSites(response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/tickets`, formData);
      toast.success('Ticket created successfully!');
      setOpen(false);
      fetchTickets(siteFilter);
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        assigned_to_division: 'Monitoring',
        site_id: undefined
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create ticket');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-green-900/30 text-green-300 border-green-800',
      Medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      High: 'bg-red-900/30 text-red-300 border-red-800'
    };
    return colors[priority] || 'bg-gray-800 text-gray-300';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': 'bg-gray-700/50 text-gray-300 border-gray-600',
      'In Progress': 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      'Closed': 'bg-gray-800 text-gray-400 border-gray-700'
    };
    return colors[status] || 'bg-gray-800 text-gray-300';
  };

  const getDivisionColor = (division) => {
    const colors = {
      'Monitoring': 'bg-blue-500',
      'Infra': 'bg-purple-500',
      'TS': 'bg-green-500'
    };
    return colors[division] || 'bg-gray-500';
  };



  // Filter and sort tickets
  const filteredAndSortedTickets = tickets
    .filter(ticket => {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.created_by_name.toLowerCase().includes(query) ||
        (ticket.site_name && ticket.site_name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      // Move 'Closed' status to the bottom
      if (a.status === 'Closed' && b.status !== 'Closed') return 1;
      if (a.status !== 'Closed' && b.status === 'Closed') return -1;

      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6" data-testid="tickets-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Ticket Management</h1>
          <p className="text-gray-300">Track and manage support tickets</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600" data-testid="create-ticket-button">
              <Plus size={18} className="mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="ticket-dialog" className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Ticket</DialogTitle>
              <DialogDescription className="text-gray-400">Fill in the details to create a new support ticket.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="ticket-title-input"
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="VLEPO/Internet/Waas Issue - Site X - 20/11/2025"
                />
              </div>

              {/* FIX 5: Site Selection Dropdown with Search */}
              <div className="space-y-2">
                <Label htmlFor="site" className="text-gray-300">Site Name</Label>
                <SiteCreationCombobox
                  sites={sites}
                  value={formData.site_id}
                  onChange={(val) => setFormData({ ...formData, site_id: val })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  data-testid="ticket-description-input"
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Detail issue di site"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Assign To Division</Label>
                  <Select value={formData.assigned_to_division} onValueChange={(value) => setFormData({ ...formData, assigned_to_division: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="division-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="Monitoring">Monitoring</SelectItem>
                      <SelectItem value="Infra">Infra</SelectItem>
                      <SelectItem value="TS">TS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-500 hover:bg-red-600" data-testid="submit-ticket-button">
                  Create Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="flex items-center space-x-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <Search size={18} className="text-gray-300" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-gray-200"
            data-testid="ticket-search-input"
          />
        </div>

        {/* Site Filter */}
        <div className="flex items-center space-x-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <Filter size={18} className="text-gray-300" />
          <Label className="text-sm font-semibold text-gray-300">Site:</Label>
          <SiteFilterCombobox
            sites={sites}
            value={siteFilter}
            onChange={setSiteFilter}
          />
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <ArrowUpDown size={18} className="text-gray-300" />
          <Label className="text-sm font-semibold text-gray-300">Sort:</Label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-300" data-testid="sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedTickets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {tickets.length === 0 ? 'No tickets created yet' : 'No tickets match your search'}
          </div>
        ) : (
          filteredAndSortedTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="bg-gray-900/50 border-gray-700 hover:shadow-lg transition-all cursor-pointer border-l-4"
              style={{ borderLeftColor: getDivisionColor(ticket.assigned_to_division).replace('bg-', '#').replace('500', '') }}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              data-testid={`ticket-card-${ticket.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-start space-x-2 text-white">
                    <AlertCircle size={20} className="text-red-500 mt-1 flex-shrink-0" />
                    <span>{ticket.title}</span>
                  </CardTitle>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-gray-400">
                  By {ticket.created_by_name} • {ticket.assigned_to_division}
                  {ticket.site_name && ` • ${ticket.site_name}`}
                </CardDescription>
                <CardDescription className="text-xs text-gray-500">
                  Created: {new Date(ticket.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-300 line-clamp-2">{ticket.description}</p>

                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </div>

                {ticket.comments && ticket.comments.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {ticket.comments.length} comment{ticket.comments.length !== 1 ? 's' : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div >
  );
};

export default Tickets;
