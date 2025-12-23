import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, Download, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const localizer = momentLocalizer(moment);
const API = `${process.env.REACT_APP_API_URL}/api`;

const Scheduler = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySchedules, setDailySchedules] = useState([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    division: '',
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });
  const [uploadFile, setUploadFile] = useState(null);

  const canEdit = user?.role === 'VP' || user?.role === 'Manager';

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/schedules`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
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

  const events = schedules.map(schedule => ({
    id: schedule.id,
    title: `${schedule.user_name}: ${schedule.title}`,
    start: new Date(schedule.start_date),
    end: new Date(schedule.end_date),
    resource: schedule
  }));

  const handleSelectSlot = ({ start, action }) => {
    if (action === 'click' || action === 'doubleClick') {
      // Show daily summary
      showDailySummary(start);
    } else if (canEdit && action === 'select') {
      // Create new schedule
      setSelectedDate(start);
      setFormData({
        ...formData,
        start_date: moment(start).format('YYYY-MM-DDTHH:mm'),
        end_date: moment(start).add(1, 'hour').format('YYYY-MM-DDTHH:mm')
      });
      setOpen(true);
    }
  };

  const showDailySummary = (date) => {
    const selectedDay = moment(date).startOf('day');
    const filtered = schedules.filter(schedule => {
      const scheduleStart = moment(schedule.start_date).startOf('day');
      const scheduleEnd = moment(schedule.end_date).startOf('day');
      return selectedDay.isBetween(scheduleStart, scheduleEnd, null, '[]');
    });
    setDailySchedules(filtered);
    setSelectedDate(date);
    setDailySummaryOpen(true);
  };

  const handleUserSelect = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setFormData({
        ...formData,
        user_id: userId,
        user_name: selectedUser.username,
        division: selectedUser.division || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.role === 'Manager' && formData.division !== user.division) {
      toast.error('You can only create schedules for your division');
      return;
    }

    try {
      await axios.post(`${API}/schedules`, formData);
      toast.success('Schedule created successfully!');
      setOpen(false);
      fetchSchedules();
      setFormData({
        user_id: '',
        user_name: '',
        division: '',
        title: '',
        description: '',
        start_date: '',
        end_date: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create schedule');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post(`${API}/schedules/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Upload errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} rows had errors. Check console for details.`);
      }
      setBulkUploadOpen(false);
      setUploadFile(null);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload schedules');
    }
  };

  const downloadTemplate = () => {
    const csv = 'user_email,title,description,start_date,end_date\nstaff@example.com,Night Shift,Night shift duties,2025-12-01 22:00,2025-12-02 06:00';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule_template.csv';
    a.click();
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleToday = () => {
    setDate(new Date());
  };

  const eventStyleGetter = (event) => {
    const colors = {
      'Monitoring': { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
      'Infra': { backgroundColor: '#8b5cf6', borderColor: '#7c3aed' },
      'TS & Apps': { backgroundColor: '#10b981', borderColor: '#059669' }
    };

    const divisionColor = colors[event.resource.division] || { backgroundColor: '#6b7280', borderColor: '#4b5563' };

    return {
      style: {
        ...divisionColor,
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        padding: '4px 8px'
      }
    };
  };

  return (
    <div className="space-y-6" data-testid="scheduler-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Schedule</h1>
          <p className="text-slate-600">
            {canEdit ? 'Manage team schedules' : 'View team schedules'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {canEdit && (
            <>
              {/* Bulk Upload Button - Prominent */}
              <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-600" data-testid="bulk-upload-button">
                    <Upload size={18} className="mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="bulk-upload-dialog">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Schedules</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBulkUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Upload CSV or Excel File</Label>
                      <Input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        data-testid="bulk-upload-input"
                      />
                      <p className="text-xs text-slate-500">Required columns: user_email, title, description, start_date, end_date</p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadTemplate}
                      className="w-full"
                      data-testid="download-template-button"
                    >
                      <Download size={16} className="mr-2" />
                      Download Template
                    </Button>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setBulkUploadOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-purple-500 hover:bg-purple-600" data-testid="upload-submit-button">
                        Upload
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg-blue-600" data-testid="create-schedule-button">
                    <Plus size={18} className="mr-2" />
                    Create Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl" data-testid="schedule-dialog">
                  <DialogHeader>
                    <DialogTitle>Create New Schedule</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={formData.user_id} onValueChange={handleUserSelect}>
                        <SelectTrigger data-testid="user-select">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter(u => user.role === 'VP' || u.division === user.division)
                            .map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.username} ({u.role} - {u.division})
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
                        data-testid="title-input"
                        placeholder="e.g., Night Shift, Site Visit"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        data-testid="description-input"
                        placeholder="Additional details..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date & Time</Label>
                        <Input
                          id="start_date"
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          required
                          data-testid="start-date-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date & Time</Label>
                        <Input
                          id="end_date"
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          required
                          data-testid="end-date-input"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-500 hover:bg-blue-600" data-testid="submit-schedule-button">
                        Create Schedule
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Calendar Navigation */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
        <div className="flex items-center space-x-2">
          <Button onClick={handleToday} variant="outline" size="sm" data-testid="today-button">
            Today
          </Button>
          <Button 
            onClick={() => handleNavigate(moment(date).subtract(1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day').toDate())} 
            variant="outline" 
            size="sm"
            data-testid="prev-button"
          >
            ←
          </Button>
          <Button 
            onClick={() => handleNavigate(moment(date).add(1, view === 'month' ? 'month' : view === 'week' ? 'week' : 'day').toDate())} 
            variant="outline" 
            size="sm"
            data-testid="next-button"
          >
            →
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={moment(date).format('YYYY-MM')} onValueChange={(val) => handleNavigate(moment(val + '-01').toDate())}>
            <SelectTrigger className="w-[180px]" data-testid="month-year-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => moment().subtract(12 - i, 'months')).map(m => (
                <SelectItem key={m.format('YYYY-MM')} value={m.format('YYYY-MM')}>
                  {m.format('MMMM YYYY')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Button 
            onClick={() => setView('month')} 
            variant={view === 'month' ? 'default' : 'outline'} 
            size="sm"
            data-testid="month-view-button"
          >
            Month
          </Button>
          <Button 
            onClick={() => setView('week')} 
            variant={view === 'week' ? 'default' : 'outline'} 
            size="sm"
            data-testid="week-view-button"
          >
            Week
          </Button>
          <Button 
            onClick={() => setView('day')} 
            variant={view === 'day' ? 'default' : 'outline'} 
            size="sm"
            data-testid="day-view-button"
          >
            Day
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
        <span className="text-sm font-semibold text-slate-600">Divisions:</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">Monitoring</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-sm">Infra</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm">TS & Apps</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl p-6 shadow-lg" data-testid="calendar-view">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          selectable={canEdit}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={setView}
          date={date}
          onNavigate={handleNavigate}
          views={['month', 'week', 'day']}
        />
      </div>

      {/* Daily Summary Dialog */}
      <Dialog open={dailySummaryOpen} onOpenChange={setDailySummaryOpen}>
        <DialogContent className="max-w-2xl" data-testid="daily-summary-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CalendarIcon size={20} />
              <span>Daily Schedule Summary - {moment(selectedDate).format('MMMM DD, YYYY')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dailySchedules.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No schedules for this day</p>
            ) : (
              dailySchedules.map(schedule => (
                <Card key={schedule.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{schedule.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold">Person:</span> {schedule.user_name}
                      </div>
                      <div>
                        <span className="font-semibold">Division:</span> {schedule.division}
                      </div>
                      <div>
                        <span className="font-semibold">Start:</span> {moment(schedule.start_date).format('HH:mm')}
                      </div>
                      <div>
                        <span className="font-semibold">End:</span> {moment(schedule.end_date).format('HH:mm')}
                      </div>
                    </div>
                    {schedule.description && (
                      <div>
                        <span className="font-semibold">Description:</span> {schedule.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scheduler;
