import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Ticket, MapPin } from 'lucide-react';
import moment from 'moment';

const API = `${process.env.REACT_APP_API_URL}/api`;

const SiteDetail = () => {
  const { siteId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteData();
  }, [siteId]);

  const fetchSiteData = async () => {
    try {
      setLoading(true);

      // Fetch site details
      const siteResponse = await axios.get(`${API}/sites`);
      const foundSite = siteResponse.data.find(s => s.id === siteId);
      setSite(foundSite);

      // Fetch tickets for this site
      const ticketsResponse = await axios.get(`${API}/tickets/list/all`);
      const siteTickets = ticketsResponse.data.filter(t => t.site_id === siteId);
      setTickets(siteTickets);

      // Fetch reports for this site
      const reportsResponse = await axios.get(`${API}/reports?site_id=${siteId}`);
      setReports(reportsResponse.data);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch site data:', error);
      toast.error('Failed to load site details');
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-green-100 text-green-800 border-green-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      High: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Open': 'bg-blue-100 text-blue-800 border-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Closed': 'bg-gray-100 text-gray-800 border-gray-200',
      'Pending SPV': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Pending VP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Final': 'bg-green-100 text-green-800 border-green-200',
      'Revisi': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-600">Loading site details...</div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-slate-600 mb-4">Site not found</div>
        <Button onClick={() => navigate('/sites')}>Back to Sites</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="site-detail-page">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/sites')} data-testid="back-button">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <MapPin size={28} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">{site.name}</h1>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            {site.location} • Created: {new Date(site.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{tickets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tickets and Reports */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets" className="space-x-2">
            <Ticket size={16} />
            <span>Tickets ({tickets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="space-x-2">
            <FileText size={16} />
            <span>Reports ({reports.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No tickets associated with this site
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map(ticket => (
                <Card
                  key={ticket.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  data-testid={`ticket-card-${ticket.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {ticket.assigned_to_division} • {ticket.created_by_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {moment(ticket.created_at).fromNow()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No reports associated with this site
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <Card
                  key={report.id}
                  className="hover:shadow-lg transition-shadow"
                  data-testid={`report-card-${report.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      By {report.submitted_by_name} • v{report.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-600 line-clamp-2">{report.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {moment(report.created_at).fromNow()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/reports', { state: { openReportId: report.id } })}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteDetail;
