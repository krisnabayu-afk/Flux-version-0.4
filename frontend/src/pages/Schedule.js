import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, Download, Calendar as CalendarIcon, Edit, Trash2, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Play, Pause, MessageSquare, Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const localizer = momentLocalizer(moment);
const API = `${process.env.REACT_APP_API_URL}/api`;

// Custom Calendar Toolbar with clickable month/year
const CustomToolbar = ({ date, onNavigate, onView, view }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(moment(date).year());
  const [selectedMonth, setSelectedMonth] = useState(moment(date).month());

  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  const handleMonthYearClick = () => {
    setSelectedYear(moment(date).year());
    setSelectedMonth(moment(date).month());
    setShowDatePicker(!showDatePicker);
  };

  const handleDateSelect = () => {
    const newDate = moment().year(selectedYear).month(selectedMonth).toDate();
    onNavigate('DATE', newDate);
    setShowDatePicker(false);
  };

  const months = moment.months();
  const currentYear = moment().year();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  return (
    <div className="rbc-toolbar flex flex-col md:flex-row gap-4 mb-4 !h-auto">
      <span className="rbc-btn-group w-full md:w-auto flex justify-center">
        <button type="button" onClick={goToToday}>Today</button>
        <button type="button" onClick={goToBack}>Back</button>
        <button type="button" onClick={goToNext}>Next</button>
      </span>
      <span className="rbc-toolbar-label relative w-full md:w-auto text-center py-2 md:py-0">
        <button
          type="button"
          onClick={handleMonthYearClick}
          className="font-bold text-lg hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 px-4 py-2"
        >
          {moment(date).format('MMMM YYYY')}
        </button>
        {showDatePicker && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="w-full [&>svg]:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="w-full [&>svg]:hidden">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleDateSelect}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  size="sm"
                >
                  Go
                </Button>
                <Button
                  onClick={() => setShowDatePicker(false)}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </span>
      <span className="rbc-btn-group w-full md:w-auto flex justify-center">
        <button type="button" onClick={() => onView('month')} className={view === 'month' ? 'rbc-active' : ''}>
          Month
        </button>
        <button type="button" onClick={() => onView('week')} className={view === 'week' ? 'rbc-active' : ''}>
          Week
        </button>
        <button type="button" onClick={() => onView('day')} className={view === 'day' ? 'rbc-active' : ''}>
          Day
        </button>
      </span>
    </div>
  );
};

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

const StaffCombobox = ({ users, value, onChange }) => {
  const [open, setOpen] = useState(false);

  const selectedUser = users.find((user) => user.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-64 justify-between"
          data-testid="staff-filter"
        >
          <span className="truncate">
            {value && value !== 'all'
              ? `${selectedUser?.username} (${selectedUser?.role} - ${selectedUser?.division})`
              : "All Staff"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search staff..." />
          <CommandList>
            <CommandEmpty>No staff found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-staff"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === 'all' ? "opacity-100" : "opacity-0"
                  )}
                />
                All Staff
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.username} ${user.role} ${user.division}`}
                  onSelect={() => {
                    onChange(user.id === value ? 'all' : user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.username} ({user.role} - {user.division})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Schedule = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]); // NEW: Sites state
  const [categories, setCategories] = useState([]); // NEW: Activity categories
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null); // For editing
  const [dailySchedules, setDailySchedules] = useState([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [filterUserId, setFilterUserId] = useState('all'); // NEW: Staff filter state
  const [filterDivision, setFilterDivision] = useState('all'); // NEW: Division filter state
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    division: '',
    category_id: '', // NEW: Activity category
    title: '',
    description: '',
    start_date: '',
    site_id: '' // NEW: Site ID
  });
  const [uploadFile, setUploadFile] = useState(null);

  // Activity Detail State
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [selectedScheduleForActivity, setSelectedScheduleForActivity] = useState(null); // To hold the schedule for which activity is being viewed
  const [activityData, setActivityData] = useState(null); // To hold the fetched activity data
  const [loadingActivity, setLoadingActivity] = useState(false);

  // PHASE 2: SPV can also edit/delete
  const canEdit = user?.role === 'VP' || user?.role === 'Manager' || user?.role === 'SPV' || user?.role === 'SuperUser';

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
    fetchSites(); // NEW: Fetch sites
    fetchCategories(); // NEW: Fetch categories
    fetchCategories(); // NEW: Fetch categories
  }, []);

  // Handle deep linking from notifications
  useEffect(() => {
    if (location.state?.openScheduleId && schedules.length > 0) {
      const scheduleId = location.state.openScheduleId;
      const schedule = schedules.find(s => s.id === scheduleId);

      if (schedule) {
        // Navigate to the date of the schedule
        const newDate = new Date(schedule.start_date);
        setDate(newDate);
        // Optional: Switch to day view or agenda view to make it easier to see?
        // setView('day'); 

        // Show the summary/details for this day
        showDailySummary(newDate);

        // Clear state to avoid reopening on refresh (optional, but good practice)
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, schedules]);

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

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`);
      setSites(response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
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
  // NEW: Apply staff and division filter
  const filteredSchedules = schedules.filter(s => {
    if (filterUserId && filterUserId !== 'all' && s.user_id !== filterUserId) return false;
    if (filterDivision && filterDivision !== 'all' && s.division !== filterDivision) return false;
    return true;
  });

  const events = filteredSchedules.map(schedule => ({
    id: schedule.id,
    title: `${schedule.user_name}: ${schedule.title}`,
    start: new Date(schedule.start_date),
    end: schedule.end_date ? new Date(schedule.end_date) : new Date(schedule.start_date),
    resource: schedule
  }));

  const handleSelectSlot = ({ start, action }) => {
    // PHASE 2: Show daily summary for all users (including Staff)
    showDailySummary(start);
  };

  const showDailySummary = (date) => {
    const selectedDay = moment(date).startOf('day');
    let filtered = schedules.filter(schedule => {
      const scheduleStart = moment(schedule.start_date).startOf('day');
      const scheduleEnd = schedule.end_date ? moment(schedule.end_date).startOf('day') : scheduleStart;
      return selectedDay.isBetween(scheduleStart, scheduleEnd, null, '[]');
    });

    // Apply staff filter if active
    if (filterUserId && filterUserId !== 'all') {
      filtered = filtered.filter(s => s.user_id === filterUserId);
    }
    // Apply division filter if active
    if (filterDivision && filterDivision !== 'all') {
      filtered = filtered.filter(s => s.division === filterDivision);
    }

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

    if (!formData.site_id) {
      toast.error('Please select a site');
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
        category_id: '',
        title: '',
        description: '',
        start_date: '',
        site_id: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create schedule');
    }
  };

  const handleEdit = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      user_id: schedule.user_id,
      user_name: schedule.user_name,
      division: schedule.division,
      category_id: schedule.category_id || '',
      title: schedule.title,
      description: schedule.description || '',
      start_date: moment(schedule.start_date).format('YYYY-MM-DDTHH:mm'),
      site_id: schedule.site_id || ''
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`${API}/schedules/${selectedSchedule.id}`, formData);
      toast.success('Schedule updated successfully!');
      setEditOpen(false);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update schedule');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await axios.delete(`${API}/schedules/${scheduleId}`);
      toast.success('Schedule deleted successfully!');
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete schedule');
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

  const handleScheduleClick = async (schedule) => {
    setActivityDetailOpen(true);
    setLoadingActivity(true);
    setSelectedScheduleForActivity(schedule); // Set the schedule first
    setActivityData(null); // Reset previous activity data

    try {
      // Fetch activity details using the public endpoint
      const response = await axios.get(`${API}/activities/schedule/${schedule.id}`);
      setActivityData(response.data || null);
    } catch (error) {
      console.error('Failed to fetch activity details:', error);
      setActivityData(null); // No activity data found
    } finally {
      setLoadingActivity(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-slate-200 text-slate-700', icon: Clock },
      'In Progress': { color: 'bg-blue-100 text-blue-700', icon: Play },
      'Finished': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'Cancelled': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'On Hold': { color: 'bg-yellow-100 text-yellow-700', icon: Pause }
    };
    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center space-x-1 w-fit`}>
        <Icon size={12} />
        <span>{status}</span>
      </Badge>
    );
  };

  const downloadTemplate = () => {
    const csv = 'user_email,title,description,start_date\\nstaff@example.com,Night Shift,Night shift duties,2025-12-01 22:00';
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
      'Infra': { backgroundColor: '#eab308', borderColor: '#ca8a04' }, // Yellow
      'TS': { backgroundColor: '#ec4899', borderColor: '#db2777' }, // Pink
      'Apps': { backgroundColor: '#ef4444', borderColor: '#dc2626' }, // Red
      'Fiberzone': { backgroundColor: '#22c55e', borderColor: '#16a34a' } // Green
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

  // PHASE 2: Check if user can edit/delete specific schedule
  const canModifySchedule = (schedule) => {
    // Grant access if user is the creator
    if (user && schedule.created_by === user.id) return true;

    if (!canEdit) return false;
    if (user.role === 'VP') return true;
    return schedule.division === user.division;
  };

  return (
    <div className="space-y-6" data-testid="schedule-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Schedule</h1>
          <p className="text-slate-600">
            {canEdit ? 'Manage team schedules' : 'View team schedules'}
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {canEdit && (
            <>
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
                    <DialogDescription>Upload a CSV or Excel file to create multiple schedules at once.</DialogDescription>
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
                      <p className="text-xs text-slate-500">Required columns: user_email, title, description, start_date</p>
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
                    <DialogDescription>Fill in the details to create a new schedule.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={formData.user_id} onValueChange={handleUserSelect}>
                        <SelectTrigger data-testid="user-select">
                          <SelectValue placeholder="Pilih Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            .filter(u => {
                              if (user.role === 'VP' || user.role === 'SuperUser') return true;
                              if (u.division === user.division) return true;
                              // Allow TS Manager/SPV to see Apps staff
                              if (user.division === 'TS' && u.division === 'Apps') return true;
                              // Allow Infra Manager/SPV to see Fiberzone staff
                              if (user.division === 'Infra' && u.division === 'Fiberzone') return true;
                              return false;
                            })
                            .map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.username} ({u.role} - {u.division})
                              </SelectItem>
                            ))}                        </SelectContent>
                      </Select>
                    </div>

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
                        data-testid="title-input"
                        placeholder="Troubleshoot - *Nama Site"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        data-testid="description-input"
                        placeholder="Contoh: Troubleshoot - Site Visit - *Nama Site."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Site *</Label>
                      <SiteCombobox
                        sites={sites}
                        value={formData.site_id}
                        onChange={(val) => setFormData({ ...formData, site_id: val })}
                      />
                      {!formData.site_id && <p className="text-xs text-red-500">Site is required</p>}
                    </div>

                    {/* PHASE 2: Only start_date required, end_date removed */}
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
                      <p className="text-xs text-slate-500">Only start date/time is required</p>
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

      {/* Staff Filter - Available to all users */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-lg border shadow-sm gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-3 flex-1 w-full">
          <Label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter by Staff:</Label>
          <StaffCombobox
            users={users}
            value={filterUserId}
            onChange={setFilterUserId}
          />
          {filterUserId && filterUserId !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterUserId('all')}
              data-testid="clear-filter"
            >
              Clear Filter
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-3 flex-1 w-full">
          <Label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter by Division:</Label>
          <Select value={filterDivision} onValueChange={setFilterDivision}>
            <SelectTrigger className="w-full md:w-64" data-testid="division-filter">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="Infra">Infra</SelectItem>
              <SelectItem value="Fiberzone">Fiberzone</SelectItem>
              <SelectItem value="TS">TS</SelectItem>
              <SelectItem value="Apps">Apps</SelectItem>
              <SelectItem value="Monitoring">Monitoring</SelectItem>
            </SelectContent>
          </Select>
          {filterDivision && filterDivision !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDivision('all')}
              data-testid="clear-division-filter"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 p-4 bg-white rounded-lg border">
        <span className="text-sm font-semibold text-slate-600">Divisions:</span>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Infra</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-pink-500 rounded"></div>
            <span className="text-sm">TS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Apps</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Fiberzone</span>
          </div>
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
          selectable
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={setView}
          date={date}
          onNavigate={handleNavigate}
          onDrillDown={showDailySummary} // Restore daily summary on date click
          views={['month', 'week', 'day']}
          components={{
            toolbar: CustomToolbar
          }}
        />
      </div>

      {/* Today's Schedule List */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Today's Schedules
          <span className="text-sm font-normal text-slate-600 ml-2">
            ({moment().format('MMMM DD, YYYY')})
          </span>
        </h2>
        <div className="space-y-3">
          {(() => {
            // Filter for today's schedules
            const today = moment().startOf('day');
            const todaySchedules = filteredSchedules.filter(schedule => {
              const scheduleStart = moment(schedule.start_date).startOf('day');
              const scheduleEnd = schedule.end_date ? moment(schedule.end_date).startOf('day') : scheduleStart;
              return today.isBetween(scheduleStart, scheduleEnd, null, '[]');
            });

            if (todaySchedules.length === 0) {
              return (
                <p className="text-slate-500 text-center py-8">
                  No schedules for today
                </p>
              );
            }

            return todaySchedules.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold">{schedule.title}</h3>
                  <p className="text-sm text-slate-600">
                    {schedule.user_name} ({schedule.division})
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {moment(schedule.start_date).format('MMM DD, YYYY HH:mm')}
                  </p>
                </div>
                {/* PHASE 2: Edit and Delete buttons for Manager/SPV (division restricted) */}
                {canModifySchedule(schedule) && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      data-testid={`edit-schedule-${schedule.id}`}
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      data-testid={`delete-schedule-${schedule.id}`}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </div >

      {/* Edit Schedule Dialog */}
      < Dialog open={editOpen} onOpenChange={setEditOpen} >
        <DialogContent className="max-w-xl" data-testid="edit-schedule-dialog">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Make changes to the schedule here.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={formData.user_id} onValueChange={handleUserSelect}>
                <SelectTrigger data-testid="edit-user-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => {
                      if (user.role === 'VP' || user.role === 'SuperUser') return true;
                      if (u.division === user.division) return true;
                      // Allow TS Manager/SPV to see Apps staff
                      if (user.division === 'TS' && u.division === 'Apps') return true;
                      // Allow Infra Manager/SPV to see Fiberzone staff
                      if (user.division === 'Infra' && u.division === 'Fiberzone') return true;
                      return false;
                    })
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username} ({u.role} - {u.division})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="edit-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="edit-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Site *</Label>
              <SiteCombobox
                sites={sites}
                value={formData.site_id}
                onChange={(val) => setFormData({ ...formData, site_id: val })}
              />
              {!formData.site_id && <p className="text-xs text-red-500">Site is required</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date & Time</Label>
              <Input
                id="edit-start-date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                data-testid="edit-start-date-input"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600" data-testid="update-schedule-button">
                Update Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog >

      {/* Daily Summary Dialog */}
      < Dialog open={dailySummaryOpen} onOpenChange={setDailySummaryOpen} >
        <DialogContent className="max-w-2xl" data-testid="daily-summary-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CalendarIcon size={20} />
              <span>Daily Schedule Summary - {moment(selectedDate).format('MMMM DD, YYYY')}</span>
            </DialogTitle>
            <DialogDescription>
              View the list of schedules for this specific day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dailySchedules.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No schedules for this day</p>
            ) : (
              dailySchedules.map(schedule => (
                <Card
                  key={schedule.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: eventStyleGetter({ resource: schedule }).style.backgroundColor }}
                  onClick={() => handleScheduleClick(schedule)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>{schedule.title}</span>
                      <div className="flex items-center space-x-2">
                        {canModifySchedule(schedule) && (
                          <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                        <span className="text-xs font-normal text-slate-500">Details</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-semibold">Person:</span> {schedule.user_name}
                      </div>
                      <div>
                        <span className="font-semibold">Division:</span> {schedule.division}
                      </div>
                      {schedule.site_name && (
                        <div className="col-span-2">
                          <span className="font-semibold">Site:</span> {schedule.site_name}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold">Start:</span> {moment(schedule.start_date).format('HH:mm')}
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
      </Dialog >

      {/* Activity Detail Dialog */}
      <Dialog open={activityDetailOpen} onOpenChange={setActivityDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>Current status and progress updates.</DialogDescription>
          </DialogHeader>

          {selectedScheduleForActivity && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <h3 className="font-semibold text-lg text-slate-800">{selectedScheduleForActivity.title}</h3>
                <p className="text-sm text-slate-600 mb-2">{selectedScheduleForActivity.user_name} ({selectedScheduleForActivity.division})</p>
                {activityData ? getStatusBadge(activityData.status) : getStatusBadge('Pending')}
              </div>

              {loadingActivity ? (
                <div className="text-center py-4 text-slate-500">Loading activity details...</div>
              ) : activityData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-slate-500 block">Last Action</span>
                      <span className="capitalize">{activityData.action_type}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Time</span>
                      <span>{moment(activityData.created_at).format('HH:mm')}</span>
                      {activityData.latitude && activityData.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${activityData.latitude},${activityData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center text-blue-500 hover:text-blue-700"
                          title="View Location"
                        >
                          <MapPin size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {activityData.notes && (
                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                      <span className="font-semibold block mb-1">Notes:</span>
                      {activityData.notes}
                    </div>
                  )}

                  {activityData.reason && (
                    <div className="bg-red-50 p-3 rounded text-sm text-red-800">
                      <span className="font-semibold block mb-1">Cancellation Reason:</span>
                      {activityData.reason}
                    </div>
                  )}

                  {activityData.progress_updates && activityData.progress_updates.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center">
                        <MessageSquare size={14} className="mr-1" /> Progress Updates
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {activityData.progress_updates.map((update, idx) => (
                          <div key={idx} className="text-sm bg-white border p-2 rounded shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span>{update.update_text}</span>
                                {update.image_url || update.image_data ? (
                                  <div className="mt-2">
                                    <img
                                      src={update.image_url
                                        ? `${process.env.REACT_APP_API_URL}${update.image_url}`
                                        : `data:image/jpeg;base64,${update.image_data}`}
                                      alt="Update attachment"
                                      className="max-h-40 rounded border border-slate-200 cursor-pointer hover:opacity-90"
                                      onClick={() => window.open(
                                        update.image_url
                                          ? `${process.env.REACT_APP_API_URL}${update.image_url}`
                                          : `data:image/jpeg;base64,${update.image_data}`,
                                        '_blank'
                                      )}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <span className="text-xs text-slate-400 whitespace-nowrap ml-2 flex flex-col items-end">
                                <span>{moment(update.timestamp).format('HH:mm')}</span>
                                {update.latitude && update.longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${update.latitude},${update.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-500 hover:text-blue-700 mt-1"
                                    title="View Location"
                                  >
                                    <MapPin size={10} className="mr-0.5" />
                                    <span className="text-[10px]">Map</span>
                                  </a>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 italic">
                  No activity recorded yet.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Schedule;
