import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, FileText, MessageSquare, CheckCircle, X, Edit } from 'lucide-react';
import moment from 'moment';

const API = `${process.env.REACT_APP_API_URL}/api`;

const TicketDetail = () => {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false); // PHASE 4: Edit dialog
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]); // PHASE 4: Sites for edit
  const [linkedReport, setLinkedReport] = useState(null);
  const [editSiteSearch, setEditSiteSearch] = useState(''); // PHASE 4: Edit site search

  const [scheduleForm, setScheduleForm] = useState({
    user_id: '',
    user_name: '',
    division: '',
    title: '',
    description: '',
    start_date: moment().format('YYYY-MM-DDTHH:mm'),
    end_date: moment().add(2, 'hours').format('YYYY-MM-DDTHH:mm'),
    ticket_id: ticketId
  });

  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    file: null
  });

  // PHASE 4: Edit ticket form
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    assigned_to_division: '',
    site_id: undefined
  });

  useEffect(() => {
    fetchTicket();
    fetchUsers();
    fetchSites(); // PHASE 4
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}`);
      setTicket(response.data);

      // Fetch linked report if exists
      if (response.data.linked_report_id) {
        const reportRes = await axios.get(`${API}/reports/${response.data.linked_report_id}`);
        setLinkedReport(reportRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      toast.error('Failed to load ticket');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // PHASE 4: Fetch sites for edit form
  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`);
      setSites(response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await axios.post(`${API}/tickets/${ticketId}/comments`, {
        ticket_id: ticketId,
        comment: comment
      });
      toast.success('Comment added');
      setComment('');
      fetchTicket();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleUserSelect = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setScheduleForm({
        ...scheduleForm,
        user_id: userId,
        user_name: selectedUser.username,
        division: selectedUser.division || ''
      });
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/schedules`, scheduleForm);
      toast.success('Schedule created and linked to ticket!');
      setShowScheduleDialog(false);
      setScheduleForm({
        user_id: '',
        user_name: '',
        division: '',
        title: '',
        description: '',
        start_date: moment().format('YYYY-MM-DDTHH:mm'),
        end_date: moment().add(2, 'hours').format('YYYY-MM-DDTHH:mm'),
        ticket_id: ticketId
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create schedule');
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', reportForm.title);
    data.append('description', reportForm.description);
    data.append('ticket_id', ticketId);
    data.append('file', reportForm.file);

    try {
      const response = await axios.post(`${API}/reports`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Link report to ticket
      await axios.post(`${API}/tickets/${ticketId}/link-report/${response.data.id}`);

      toast.success('Report submitted and linked to ticket!');
      setShowReportDialog(false);
      setReportForm({ title: '', description: '', file: null });
      fetchTicket();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit report');
    }
  };

  const handleCloseTicket = async () => {
    try {
      await axios.post(`${API}/tickets/${ticketId}/close`);
      toast.success('Ticket closed successfully!');
      fetchTicket();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cannot close ticket yet');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${API}/tickets/${ticketId}`, { status: newStatus });
      toast.success('Status updated');
      fetchTicket();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // PHASE 4: Edit ticket functionality
  const handleEditTicket = () => {
    setEditForm({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      assigned_to_division: ticket.assigned_to_division,
      site_id: ticket.site_id || undefined
    });
    setEditSiteSearch('');
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`${API}/tickets/${ticketId}`, editForm);
      toast.success('Ticket updated successfully!');
      setShowEditDialog(false);
      fetchTicket();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update ticket');
    }
  };

  // PHASE 4 FIX: All users can edit tickets
  const canEdit = user?.role ? true : false;

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Loading ticket...</div>
      </div>
    );
  }

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

  const canManage = ['Manager', 'VP'].includes(user?.role);
  // PHASE 4 FIX: All users can close tickets
  const canClose = user?.role && ticket.status !== 'Closed';
  const isCloseDisabled = ticket.linked_report_id && linkedReport?.status !== 'Final';

  return (
    <div className="space-y-6" data-testid="ticket-detail-page">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/tickets')} data-testid="back-button">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{ticket.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Created by {ticket.created_by_name} on {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getPriorityColor(ticket.priority)}>
            {ticket.priority} Priority
          </Badge>
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card data-testid="ticket-details" className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-400">Assigned To:</p>
                  <p className="text-gray-200">{ticket.assigned_to_division}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-400">Last Updated:</p>
                  <p className="text-gray-200">{new Date(ticket.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Report Status */}
          {ticket.linked_report_id && linkedReport && (
            <Card className="border-purple-800 bg-purple-900/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2 text-white">
                  <FileText className="text-purple-400" size={20} />
                  <span>Linked Report</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-200">{linkedReport.title}</p>
                  <p className="text-sm text-gray-400">{linkedReport.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge className={linkedReport.status === 'Final' ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'}>
                      {linkedReport.status}
                    </Badge>
                    <Link to="/reports" className="text-sm text-purple-400 hover:text-purple-300 font-semibold">
                      View in Reports
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card data-testid="comments-section" className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <MessageSquare size={20} />
                <span>Comments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                <div className="space-y-3">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm text-gray-200">{c.user_name}</p>
                        <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-gray-300">{c.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No comments yet</p>
              )}

              <form onSubmit={handleAddComment} className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  data-testid="comment-input"
                  rows={3}
                />
                <Button type="submit" size="sm" data-testid="add-comment-button">
                  Add Comment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Status Management */}
          {canManage && ticket.status !== 'Closed' && (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Manage Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger data-testid="status-select" className="bg-gray-800 border-gray-700 text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Integration Actions */}
          <Card className="border-2 border-gray-600 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* PHASE 4: Edit Ticket Button */}
              {canEdit && ticket.status !== 'Closed' && (
                <Button
                  onClick={handleEditTicket}
                  className="w-full bg-gray-600 hover:bg-gray-700"
                  data-testid="edit-ticket-button"
                >
                  <Edit size={16} className="mr-2" />
                  Edit Ticket
                </Button>
              )}

              {/* Add to Schedule */}
              {canManage && (
                <Button
                  onClick={() => setShowScheduleDialog(true)}
                  className="w-full bg-gray-600 hover:bg-gray-700"
                  data-testid="add-to-schedule-button"
                >
                  <Calendar size={16} className="mr-2" />
                  Add to Schedule
                </Button>
              )}

              {/* Submit Report */}
              {!ticket.linked_report_id && (
                <Button
                  onClick={() => setShowReportDialog(true)}
                  className="w-full bg-purple-500 hover:bg-purple-600"
                  data-testid="submit-report-button"
                >
                  <FileText size={16} className="mr-2" />
                  Submit Report
                </Button>
              )}

              {/* Close Ticket */}
              {canClose && (
                <div className="space-y-2">
                  <Button
                    onClick={handleCloseTicket}
                    disabled={isCloseDisabled}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    data-testid="close-ticket-button"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Close Ticket
                  </Button>
                  {isCloseDisabled && (
                    <p className="text-xs text-red-600 text-center">
                      Linked report must be approved before closing
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add to Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-xl" data-testid="schedule-dialog">
          <DialogHeader>
            <DialogTitle>Add Ticket to Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={scheduleForm.user_id} onValueChange={handleUserSelect}>
                <SelectTrigger data-testid="schedule-user-select">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => user.role === 'VP' || u.division === ticket.assigned_to_division)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username} ({u.role} - {u.division})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-title">Title</Label>
              <Input
                id="schedule-title"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                required
                data-testid="schedule-title-input"
                placeholder={`Work on: ${ticket.title}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-description">Description</Label>
              <Textarea
                id="schedule-description"
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                data-testid="schedule-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-start">Start</Label>
                <Input
                  id="schedule-start"
                  type="datetime-local"
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                  required
                  data-testid="schedule-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-end">End</Label>
                <Input
                  id="schedule-end"
                  type="datetime-local"
                  value={scheduleForm.end_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                  required
                  data-testid="schedule-end-input"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gray-600 hover:bg-gray-700" data-testid="create-schedule-submit">
                Create Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent data-testid="report-dialog">
          <DialogHeader>
            <DialogTitle>Submit Report for Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-title">Title</Label>
              <Input
                id="report-title"
                value={reportForm.title}
                onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                required
                data-testid="report-title-input"
                placeholder={`Report for: ${ticket.title}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                required
                data-testid="report-description-input"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-file">Upload Document</Label>
              <Input
                id="report-file"
                type="file"
                onChange={(e) => setReportForm({ ...reportForm, file: e.target.files[0] })}
                required
                data-testid="report-file-input"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-500 hover:bg-purple-600" data-testid="submit-report-form">
                Submit Report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PHASE 4: Edit Ticket Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl" data-testid="edit-ticket-dialog">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                data-testid="edit-ticket-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
                rows={5}
                data-testid="edit-ticket-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(value) => setEditForm({ ...editForm, priority: value })}
                >
                  <SelectTrigger data-testid="edit-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-division">Assigned To Division</Label>
                <Select
                  value={editForm.assigned_to_division}
                  onValueChange={(value) => setEditForm({ ...editForm, assigned_to_division: value })}
                >
                  <SelectTrigger data-testid="edit-ticket-division">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monitoring">Monitoring</SelectItem>
                    <SelectItem value="Infra">Infra</SelectItem>
                    <SelectItem value="TS">TS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-site">Site (Optional)</Label>
              <div className="relative">
                <Input
                  placeholder="Search sites..."
                  value={editSiteSearch}
                  onChange={(e) => setEditSiteSearch(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={editForm.site_id}
                  onValueChange={(value) => setEditForm({ ...editForm, site_id: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger data-testid="edit-ticket-site">
                    <SelectValue placeholder="Select site (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Site</SelectItem>
                    {sites
                      .filter(site => site.name.toLowerCase().includes(editSiteSearch.toLowerCase()))
                      .map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gray-600 hover:bg-gray-700" data-testid="update-ticket-button">
                Update Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetail;
