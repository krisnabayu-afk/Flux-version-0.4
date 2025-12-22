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
import { Plus, Trash2 } from 'lucide-react';

const localizer = momentLocalizer(moment);
const API = `${process.env.REACT_APP_API_URL}/api`;

const Scheduler = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    division: '',
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

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

  const handleSelectSlot = ({ start }) => {
    if (canEdit) {
      setSelectedDate(start);
      setFormData({
        ...formData,
        start_date: moment(start).format('YYYY-MM-DDTHH:mm'),
        end_date: moment(start).add(1, 'hour').format('YYYY-MM-DDTHH:mm')
      });
      setOpen(true);
    }
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

    // Check permissions
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

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await axios.delete(`${API}/schedules/${scheduleId}`);
      toast.success('Schedule deleted successfully!');
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
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
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Scheduler</h1>
          <p className="text-slate-600">
            {canEdit ? 'Click on a date to create a schedule' : 'View team schedules'}
          </p>
        </div>

        {canEdit && (
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
        )}
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
          views={['month', 'week', 'day']}
          defaultView="month"
        />
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-slate-800 mb-4">All Schedules</h2>
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No schedules created yet</p>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold">{schedule.title}</h3>
                  <p className="text-sm text-slate-600">
                    {schedule.user_name} ({schedule.division})
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {moment(schedule.start_date).format('MMM DD, YYYY HH:mm')} - {moment(schedule.end_date).format('MMM DD, YYYY HH:mm')}
                  </p>
                </div>
                {canEdit && (user.role === 'VP' || schedule.division === user.division) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(schedule.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid={`delete-schedule-${schedule.id}`}
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
