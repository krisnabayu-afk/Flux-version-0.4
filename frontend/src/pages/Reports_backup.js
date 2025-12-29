import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Download, Check, X, Eye } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Reports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null
  });
  const [approvalData, setApprovalData] = useState({
    report_id: '',
    action: '',
    comment: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('file', formData.file);

    try {
      await axios.post(`${API}/reports`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Report submitted successfully!');
      setOpen(false);
      fetchReports();
      setFormData({ title: '', description: '', file: null });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit report');
    }
  };

  const handleApproval = async (reportId, action) => {
    if (action === 'reject') {
      const comment = prompt('Please provide a reason for rejection:');
      if (!comment) {
        toast.error('Rejection reason is required');
        return;
      }
      setApprovalData({ report_id: reportId, action, comment });
    } else {
      setApprovalData({ report_id: reportId, action: 'approve', comment: '' });
    }

    try {
      const payload = action === 'reject' 
        ? { report_id: reportId, action, comment: prompt('Rejection reason:') }
        : { report_id: reportId, action: 'approve' };

      await axios.post(`${API}/reports/approve`, payload);
      toast.success(action === 'approve' ? 'Report approved!' : 'Report rejected');
      fetchReports();
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

  const downloadFile = (fileData, fileName) => {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${fileData}`;
    link.download = fileName;
    link.click();
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending SPV': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Pending VP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Final': 'bg-green-100 text-green-800 border-green-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canApprove = (report) => {
    if (!['SPV', 'Manager', 'VP'].includes(user?.role)) return false;
    if (report.current_approver === user.id) return true;
    if (user.role === 'VP' && report.status !== 'Final' && report.status !== 'Rejected') return true;
    return false;
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Report Approval</h1>
          <p className="text-slate-600">Submit and manage document approvals</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600" data-testid="submit-report-button">
              <Plus size={18} className="mr-2" />
              Submit Report
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="report-dialog">
            <DialogHeader>
              <DialogTitle>Submit New Report</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="report-title-input"
                  placeholder="Monthly Report, Incident Report, etc."
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
                  placeholder="Brief description of the report..."
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

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            No reports submitted yet
          </div>
        ) : (
          reports.map((report) => (
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
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{report.description}</p>
                
                {report.rejection_comment && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-xs text-red-700">{report.rejection_comment}</p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReport(report.id)}
                    data-testid={`view-report-${report.id}`}
                  >
                    <Eye size={14} className="mr-1" />
                    View
                  </Button>

                  {canApprove(report) && report.status !== 'Final' && report.status !== 'Rejected' && (
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
                        onClick={() => handleApproval(report.id, 'reject')}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        data-testid={`reject-${report.id}`}
                      >
                        <X size={14} className="mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Submitted {new Date(report.created_at).toLocaleDateString()}
                </p>
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
          </DialogHeader>
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
                <div>
                  <p className="font-semibold">Version:</p>
                  <p className="text-slate-600">{selectedReport.version}</p>
                </div>
                <div>
                  <p className="font-semibold">File:</p>
                  <p className="text-slate-600">{selectedReport.file_name}</p>
                </div>
              </div>

              <Button
                onClick={() => downloadFile(selectedReport.file_data, selectedReport.file_name)}
                className="w-full"
                data-testid="download-report-button"
              >
                <Download size={16} className="mr-2" />
                Download Document
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
