import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Download, Check, X, Eye, Filter, Edit, Search, ArrowUpDown, ChevronsUpDown, Trash2 } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';

const API = `${process.env.REACT_APP_API_URL}/api`;


const SiteCombobox = ({ sites, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? sites.find((site) => site.id === value)?.name
            : "Select site..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search site..." />
          <CommandList>
            <CommandEmpty>No site found.</CommandEmpty>
            <CommandGroup>
              {sites.map((site) => (
                <CommandItem
                  key={site.id}
                  value={site.name}
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

const TicketCombobox = ({ tickets, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? tickets.find((ticket) => ticket.id === value)?.title
            : "Select ticket..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search ticket..." />
          <CommandList>
            <CommandEmpty>No ticket found.</CommandEmpty>
            <CommandGroup>
              {tickets.map((ticket) => (
                <CommandItem
                  key={ticket.id}
                  value={ticket.title}
                  onSelect={() => {
                    onChange(ticket.id === value ? "" : ticket.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === ticket.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {ticket.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

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
          className="w-full justify-between"
          data-testid="site-filter-select"
        >
          {value && value !== 'all'
            ? selectedSite?.name
            : "All Sites"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search site..." />
          <CommandList>
            <CommandEmpty>No site found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-sites"
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

const Reports = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [sites, setSites] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]); // NEW: Activity categories
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false); // PHASE 3: Edit dialog
  const [selectedReport, setSelectedReport] = useState(null);
  const [siteFilter, setSiteFilter] = useState(undefined);
  const [siteSearch, setSiteSearch] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [editSiteSearch, setEditSiteSearch] = useState(''); // PHASE 3: Edit site search
  const [editTicketSearch, setEditTicketSearch] = useState(''); // PHASE 3: Edit ticket search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [formData, setFormData] = useState({
    category_id: '', // NEW: Activity category
    title: '',
    description: '',
    site_id: '',
    ticket_id: '',
    ticket_id: '',
    file: null
  });
  const [commentText, setCommentText] = useState(''); // NEW: Comment text state
  const [editFormData, setEditFormData] = useState({ // PHASE 3: Edit form data
    title: '',
    description: '',
    site_id: '',
    ticket_id: '',
    file: null // NEW: File replacement
  });

  useEffect(() => {
    fetchReports();
    fetchSites();
    fetchTickets();
    fetchCategories(); // NEW: Fetch categories
  }, []);

  // Handle opening report from navigation state (e.g., from SiteDetail)
  useEffect(() => {
    if (location.state?.openReportId) {
      handleViewReport(location.state.openReportId);
      // Clear the state after using it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (siteFilter && siteFilter !== 'all') {
      fetchReports(siteFilter);
    } else {
      fetchReports();
    }
  }, [siteFilter]);

  const fetchReports = async (site_id = '') => {
    try {
      const url = site_id ? `${API}/reports?site_id=${site_id}` : `${API}/reports`;
      const response = await axios.get(url);
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets/list/all`);
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/activity-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    if (formData.category_id) data.append('category_id', formData.category_id);
    data.append('title', formData.title);
    data.append('description', formData.description);
    if (formData.site_id) data.append('site_id', formData.site_id);
    if (formData.ticket_id) data.append('ticket_id', formData.ticket_id);
    data.append('file', formData.file);

    try {
      await axios.post(`${API}/reports`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Report submitted successfully!');
      setOpen(false);
      fetchReports();
      setFormData({ category_id: '', title: '', description: '', site_id: '', ticket_id: '', file: null });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit report');
    }
  };

  const handleApproval = async (reportId, action) => {
    let comment = null;
    // PHASE 3: Renamed reject to revisi
    if (action === 'revisi') {
      comment = prompt('Please provide a reason for revision:');
      if (!comment) {
        toast.error('Revision reason is required');
        return;
      }
    }

    try {
      const payload = action === 'revisi'
        ? { report_id: reportId, action, comment }
        : { report_id: reportId, action: 'approve' };

      await axios.post(`${API}/reports/approve`, payload);
      toast.success(action === 'approve' ? 'Report approved!' : 'Report sent for revision');
      fetchReports(siteFilter);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process approval');
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await axios.get(`${API}/reports/${reportId}`);
      setSelectedReport(response.data);
      setViewOpen(true);
    } catch (error) {
      toast.error('Failed to load report');
    }
  };

  // PHASE 3: Edit report functionality
  const handleEditReport = (report) => {
    setSelectedReport(report);
    setEditFormData({
      title: report.title,
      description: report.description,
      site_id: report.site_id || '',
      ticket_id: report.ticket_id || '',
      file: null // Reset file
    });
    setEditSiteSearch('');
    setEditTicketSearch('');
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', editFormData.title);
    data.append('description', editFormData.description);
    if (editFormData.site_id) data.append('site_id', editFormData.site_id);
    if (editFormData.ticket_id) data.append('ticket_id', editFormData.ticket_id);
    if (editFormData.file) data.append('file', editFormData.file);

    try {
      await axios.put(`${API}/reports/${selectedReport.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Report updated successfully!');
      setEditOpen(false);
      fetchReports(siteFilter);
      // Refresh selected report if viewing it
      if (viewOpen && selectedReport.id) {
        handleViewReport(selectedReport.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update report');
    }
  };

  const canEditReport = (report) => {
    // Only the creator can edit their report
    // Only the creator can edit their report
    return report.submitted_by === user.id;
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;

    try {
      await axios.delete(`${API}/reports/${reportId}`);
      toast.success('Report deleted successfully');
      setOpen(false); // Close any open dialogs if needed
      setViewOpen(false);
      fetchReports(siteFilter);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete report');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await axios.post(`${API}/reports/${selectedReport.id}/comments`, { text: commentText });
      toast.success('Comment added!');
      setCommentText('');
      // Refresh report details
      const response = await axios.get(`${API}/reports/${selectedReport.id}`);
      setSelectedReport(response.data);
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const downloadFile = (fileUrl, fileData, fileName) => {
    if (fileUrl) {
      // Use URL if available
      const link = document.createElement('a');
      link.href = `${process.env.REACT_APP_API_URL}${fileUrl}`;
      link.download = fileName;
      link.target = "_blank"; // Open in new tab if possible
      link.click();
    } else if (fileData) {
      // Fallback to base64
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${fileData}`;
      link.download = fileName;
      link.click();
    } else {
      toast.error("File not available");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending SPV': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Pending VP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Final': 'bg-green-100 text-green-800 border-green-200',
      'Revisi': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canApprove = (report) => {
    // PHASE 3: Non-linear approval logic
    if (!['SPV', 'Manager', 'VP'].includes(user?.role)) return false;
    if (report.status === 'Final' || report.status === 'Revisi') return false;

    // VP can approve at any stage
    if (user.role === 'VP') return true;

    // Manager can approve if status is Pending SPV or Pending Manager
    if (user.role === 'Manager' && ['Pending SPV', 'Pending Manager'].includes(report.status)) return true;

    // SPV can approve only if they are the current approver
    if (report.current_approver === user.id) return true;

    return false;
  };

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(siteSearch.toLowerCase())
  );

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  // Filter and sort reports
  const filteredAndSortedReports = reports
    .filter(report => {
      const query = searchQuery.toLowerCase();
      return (
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.submitted_by_name.toLowerCase().includes(query) ||
        (report.site_name && report.site_name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Report Management</h1>
          <p className="text-slate-600">Submit and manage your reports here</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600" data-testid="submit-report-button">
              <Plus size={18} className="mr-2" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl" data-testid="report-dialog">
            <DialogHeader>
              <DialogTitle>Submit New Report</DialogTitle>
              <DialogDescription>Fill in the details to submit a new report.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Activity Category *</Label>
                <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val })}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="report-title-input"
                  placeholder="Troubleshoot - *Kendala - *Site"
                />
              </div>

              {/* Site Selection with Combobox */}
              <div className="space-y-2">
                <Label>Site Name</Label>
                <SiteCombobox
                  sites={sites}
                  value={formData.site_id}
                  onChange={(val) => setFormData({ ...formData, site_id: val })}
                />
              </div>

              {/* Ticket Selection with Combobox */}
              <div className="space-y-2">
                <Label>Related Ticket (Optional)</Label>
                <TicketCombobox
                  tickets={tickets}
                  value={formData.ticket_id}
                  onChange={(val) => setFormData({ ...formData, ticket_id: val })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  data-testid="report-description-input"
                  placeholder="Deskripsi singkat report"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Upload Document</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                  required
                  data-testid="report-file-input"
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-500 hover:bg-purple-600" data-testid="submit-report-form">
                  Submit Report
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="flex items-center space-x-2 p-4 bg-white rounded-lg border">
          <Search size={18} className="text-slate-600" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="report-search-input"
          />
        </div>

        <div className="flex items-center space-x-2 p-4 bg-white rounded-lg border">
          <Filter size={18} className="text-slate-600" />
          <Label className="text-sm font-semibold">Site:</Label>
          <SiteFilterCombobox
            sites={sites}
            value={siteFilter}
            onChange={setSiteFilter}
          />
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2 p-4 bg-white rounded-lg border">
          <ArrowUpDown size={18} className="text-slate-600" />
          <Label className="text-sm font-semibold">Sort:</Label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full" data-testid="sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedReports.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            {reports.length === 0 ? 'No reports submitted yet' : 'No reports match your search'}
          </div>
        ) : (
          filteredAndSortedReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow" data-testid={`report-card-${report.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  By {report.submitted_by_name} • v{report.version}
                  {report.category_name && ` • ${report.category_name}`}
                  {report.site_name && ` • ${report.site_name}`}
                </CardDescription>
                <CardDescription className="text-xs text-slate-400">
                  Created: {new Date(report.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{report.description}</p>

                {report.rejection_comment && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-semibold text-orange-800 mb-1">Revision Required:</p>
                    <p className="text-xs text-orange-700">{report.rejection_comment}</p>
                  </div>
                )}

                <div className="flex items-center space-x-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReport(report.id)}
                    data-testid={`view-report-${report.id}`}
                  >
                    <Eye size={14} className="mr-1" />
                    View
                  </Button>

                  {/* PHASE 3: Edit button for report creator */}
                  {canEditReport(report) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReport(report)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      data-testid={`edit-report-${report.id}`}
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                  )}

                  {/* PHASE 3: Show approve/revisi buttons with non-linear logic */}
                  {canApprove(report) && report.status !== 'Final' && report.status !== 'Revisi' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(report.id, 'approve')}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        data-testid={`approve-${report.id}`}
                      >
                        <Check size={14} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(report.id, 'revisi')}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        data-testid={`revisi-${report.id}`}
                      >
                        <X size={14} className="mr-1" />
                        Revisi
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Report Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl" data-testid="view-report-dialog">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>View the details of the selected report.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-4">
            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedReport.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{selectedReport.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">Submitted By:</p>
                    <p className="text-slate-600">{selectedReport.submitted_by_name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Status:</p>
                    <Badge className={getStatusColor(selectedReport.status)}>
                      {selectedReport.status}
                    </Badge>
                  </div>
                  {selectedReport.category_name && (
                    <div>
                      <p className="font-semibold">Category:</p>
                      <p className="text-slate-600">{selectedReport.category_name}</p>
                    </div>
                  )}
                  {selectedReport.site_name && (
                    <div>
                      <p className="font-semibold">Site:</p>
                      <p className="text-slate-600">{selectedReport.site_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">Version:</p>
                    <p className="text-slate-600">{selectedReport.version}</p>
                  </div>
                  <div>
                    <p className="font-semibold">File:</p>
                    <p className="text-slate-600">{selectedReport.file_name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Created:</p>
                    <p className="text-slate-600">{new Date(selectedReport.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <Button
                  onClick={() => downloadFile(selectedReport.file_url, selectedReport.file_data, selectedReport.file_name)}
                  className="w-full"
                  data-testid="download-report-button"
                >
                  <Download size={16} className="mr-2" />
                  Download Document
                </Button>

                {/* Comments Section */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Comments</h4>
                  <div className="space-y-4 max-h-60 overflow-y-auto mb-4">
                    {selectedReport.comments && selectedReport.comments.length > 0 ? (
                      selectedReport.comments.map((comment, index) => (
                        <div key={index} className="bg-slate-50 p-3 rounded-lg text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-slate-700">{comment.user_name}</span>
                            <span className="text-xs text-slate-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic">No comments yet.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!commentText.trim()}>
                      Post
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </ScrollArea>
          {/* Footer Action Buttons */}
          {selectedReport && canEditReport(selectedReport) && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => handleDeleteReport(selectedReport.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PHASE 3: Edit Report Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl" data-testid="edit-report-dialog">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                required
                data-testid="edit-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                required
                rows={4}
                data-testid="edit-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Site (Optional)</Label>
              <SiteCombobox
                sites={sites}
                value={editFormData.site_id}
                onChange={(val) => setEditFormData({ ...editFormData, site_id: val })}
              />
            </div>

            <div className="space-y-2">
              <Label>Link to Ticket (Optional)</Label>
              <TicketCombobox
                tickets={tickets}
                value={editFormData.ticket_id}
                onChange={(val) => setEditFormData({ ...editFormData, ticket_id: val })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-file">Replace File (Optional)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="edit-file"
                  type="file"
                  onChange={(e) => setEditFormData({ ...editFormData, file: e.target.files[0] })}
                  data-testid="edit-file-input"
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                />
              </div>
              {selectedReport && selectedReport.file_name && (
                <p className="text-xs text-slate-500">Current file: {selectedReport.file_name}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600" data-testid="update-report-button">
                Update Report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Reports;
