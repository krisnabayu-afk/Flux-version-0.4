import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Calendar, FileText, Ticket, LayoutDashboard, LogOut, User, MapPin, UserCheck, Settings, Menu, ClipboardCheck, Tag, Users, BarChart } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.type === 'schedule_assigned' && notification.related_id) {
      // Navigate to schedule page with the specific schedule ID
      navigate('/scheduler', { state: { openScheduleId: notification.related_id } });
    } else if (['report_submitted', 'report_approved', 'report_rejected', 'report_comment', 'report_revisied'].includes(notification.type) && notification.related_id) {
      // Navigate to reports page and open the specific report
      navigate('/reports', { state: { openReportId: notification.related_id } });
    } else if (notification.type === 'ticket_assigned' && notification.related_id) {
      navigate(`/tickets/${notification.related_id}`);
    } else if (notification.type === 'account_approval' || notification.type === 'account_status_change') {
      navigate('/accounts');
    } else if (notification.type?.startsWith('activity_')) {
      navigate('/activity');
    } else if (notification.type === 'shift_change_request' || notification.type === 'shift_change_status') {
      navigate('/scheduler');
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/activity', label: 'Activity', icon: ClipboardCheck },
    { path: '/scheduler', label: 'Schedule', icon: Calendar },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/statistics', label: 'Statistics', icon: BarChart }, // NEW: Statistics
    { path: '/tickets', label: 'Tickets', icon: Ticket },
    { path: '/sites', label: 'Sites', icon: MapPin }, // FIX 2: No role restriction - all can access
    { path: '/categories', label: 'Categories', icon: Tag, roles: ['SuperUser'] }, // SuperUser only
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <img src="/logo.png" alt="Flux" className="w-10 h-10 rounded-lg shadow-lg" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Flux
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  // Check role-based access
                  if (item.roles && !item.roles.includes(user?.role)) return null;
                  // Check division-based exclusion
                  if (item.excludeDivisions && item.excludeDivisions.includes(user?.division)) return null;

                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Menu */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-600">
                      <Menu size={24} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle className="text-left flex items-center space-x-2">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Flux
                        </span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-8 flex flex-col space-y-2">
                      {navItems.map((item) => {
                        if (item.roles && !item.roles.includes(user?.role)) return null;
                        if (item.excludeDivisions && item.excludeDivisions.includes(user?.division)) return null;
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => document.body.click()} // Close sheet on click (hacky but works with SheetTrigger)
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <Badge
                        data-testid="notification-count"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent data-testid="notification-panel">
                  <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                    {notifications.length === 0 ? (
                      <p className="text-center text-slate-500 mt-8">No notifications</p>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            data-testid={`notification-${notification.id}`}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${notification.read
                              ? 'bg-white border-slate-200'
                              : 'bg-blue-50 border-blue-200 shadow-sm'
                              }`}
                          >
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-slate-400 mt-2">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2" data-testid="user-menu">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden">
                      {user?.profile_photo ? (
                        <img
                          src={`data:image/jpeg;base64,${user.profile_photo}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={16} className="text-white" />
                      )}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold">{user?.username}</p>
                      <p className="text-xs text-slate-500">{user?.role}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* My Profile - Available to all users */}
                  <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="profile-menu">
                    <User size={16} className="mr-2" />
                    My Profile
                  </DropdownMenuItem>

                  {/* Account Management - Only for Managers, VP, and SuperUser */}
                  {(user?.role === 'Manager' || user?.role === 'VP' || user?.role === 'SuperUser') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/accounts')} data-testid="accounts-menu">
                        <UserCheck size={16} className="mr-2" />
                        Account Approvals
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="fade-in">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
