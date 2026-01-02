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
      Low: 'bg-green-900/30 text-green-300 border-green-800',
      Medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      High: 'bg-red-900/30 text-red-300 border-red-800'
    };
    return colors[priority] || 'bg-slate-800 text-slate-300';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Open': 'bg-gray-700/50 text-gray-300 border-gray-600',
      'In Progress': 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      'Closed': 'bg-slate-800 text-slate-400 border-slate-700',
      'Pending SPV': 'bg-purple-900/30 text-purple-300 border-purple-800',
      'Pending Manager': 'bg-purple-900/30 text-purple-300 border-purple-800',
      'Pending VP': 'bg-indigo-900/30 text-indigo-300 border-indigo-800',
      'Final': 'bg-green-900/30 text-green-300 border-green-800',
      'Revisi': 'bg-orange-900/30 text-orange-300 border-orange-800'
    };
    return statusColors[status] || 'bg-slate-800 text-slate-300';
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
        <Button variant="ghost" onClick={() => navigate('/sites')} data-testid="back-button" className="text-slate-300 hover:bg-slate-800">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <MapPin size={28} className="text-gray-400" />
            <h1 className="text-3xl font-bold text-white">{site.name}</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {site.location} • Created: {new Date(site.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-300">{tickets.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{reports.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Tickets and Reports */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="tickets" className="space-x-2 text-slate-400 data-[state=active]:text-white">
            <Ticket size={16} />
            <span>Tickets ({tickets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="space-x-2 text-slate-400 data-[state=active]:text-white">
            <FileText size={16} />
            <span>Reports ({reports.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          {tickets.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="py-12 text-center text-slate-500">
                No tickets associated with this site
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map(ticket => (
                <Card
                  key={ticket.id}
                  className="bg-slate-900/50 border-slate-700 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  data-testid={`ticket-card-${ticket.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white">{ticket.title}</CardTitle>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-400">
                      {ticket.assigned_to_division} • {ticket.created_by_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-300 line-clamp-2">{ticket.description}</p>
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
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="py-12 text-center text-slate-500">
                No reports associated with this site
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <Card
                  key={report.id}
                  className="bg-slate-900/50 border-slate-700 hover:shadow-lg transition-shadow"
                  data-testid={`report-card-${report.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white">{report.title}</CardTitle>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-400">
                      By {report.submitted_by_name} • v{report.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-slate-300 line-clamp-2">{report.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {moment(report.created_at).fromNow()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/reports', { state: { openReportId: report.id } })}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
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
