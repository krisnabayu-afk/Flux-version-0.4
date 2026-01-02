import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, FileCheck, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    schedules_today: [],
    pending_approvals: [],
    open_tickets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-green-900/30 text-green-300 border-green-800',
      Medium: 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      High: 'bg-red-900/30 text-red-300 border-red-800'
    };
    return colors[priority] || 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending SPV': 'bg-purple-900/30 text-purple-300 border-purple-800',
      'Pending Manager': 'bg-purple-900/30 text-purple-300 border-purple-800',
      'Pending VP': 'bg-indigo-900/30 text-indigo-300 border-indigo-800',
      'Final': 'bg-green-900/30 text-green-300 border-green-800',
      'Open': 'bg-gray-700/30 text-gray-300 border-gray-600',
      'In Progress': 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
      'Closed': 'bg-gray-800 text-gray-400 border-gray-700'
    };
    return colors[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-300">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-lg text-slate-300">
          {user?.role} {user?.division && `- ${user.division}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Schedules */}
        <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="schedules-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="text-gray-400" size={24} />
                <span>Today's Schedules</span>
              </CardTitle>
              <Badge variant="secondary">{dashboardData.schedules_today.length}</Badge>
            </div>
            <CardDescription>Your tasks for today</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.schedules_today.length === 0 ? (
              <p className="text-gray-400 text-sm">No schedules for today</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.schedules_today.map((schedule) => (
                  <div key={schedule.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="font-semibold text-sm text-gray-200">{schedule.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {schedule.description}
                      {schedule.category_name && ` • ${schedule.category_name}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        {['SPV', 'Manager', 'VP'].includes(user?.role) && (
          <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="approvals-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="text-purple-500" size={24} />
                  <span>Pending Approvals</span>
                </CardTitle>
                <Badge variant="secondary">{dashboardData.pending_approvals.length}</Badge>
              </div>
              <CardDescription>Reports awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.pending_approvals.length === 0 ? (
                <p className="text-gray-400 text-sm">No pending approvals</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData.pending_approvals.map((report) => (
                    <Link key={report.id} to="/reports">
                      <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-800 hover:bg-purple-900/50 transition-colors cursor-pointer">
                        <p className="font-semibold text-sm text-gray-200">{report.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">By {report.submitted_by_name}</p>
                          <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Open Tickets */}
        {['Manager', 'VP'].includes(user?.role) && (
          <Card className="border-2 hover:shadow-lg transition-shadow" data-testid="tickets-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <TicketIcon className="text-red-500" size={24} />
                  <span>Open Tickets</span>
                </CardTitle>
                <Badge variant="secondary">{dashboardData.open_tickets.length}</Badge>
              </div>
              <CardDescription>Active issues to manage</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.open_tickets.length === 0 ? (
                <p className="text-gray-400 text-sm">No open tickets</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData.open_tickets.slice(0, 3).map((ticket) => (
                    <Link key={ticket.id} to={`/tickets/${ticket.id}`}>
                      <div className="p-3 bg-red-900/30 rounded-lg border border-red-800 hover:bg-red-900/50 transition-colors cursor-pointer">
                        <p className="font-semibold text-sm text-gray-200">{ticket.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {dashboardData.open_tickets.length > 3 && (
                    <Link to="/tickets" className="block text-center text-sm text-gray-400 hover:text-gray-300 font-semibold mt-2">
                      View all {dashboardData.open_tickets.length} tickets
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2">My Schedules Today</h3>
          <p className="text-4xl font-bold">{dashboardData.schedules_today.length}</p>
        </div>
        {['SPV', 'Manager', 'VP'].includes(user?.role) && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Awaiting My Approval</h3>
            <p className="text-4xl font-bold">{dashboardData.pending_approvals.length}</p>
          </div>
        )}
        {['Manager', 'VP'].includes(user?.role) && (
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Active Tickets</h3>
            <p className="text-4xl font-bold">{dashboardData.open_tickets.length}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
