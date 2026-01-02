import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { UserCheck, Check, X, Users, Trash2, Shield } from 'lucide-react';

const API = `${process.env.REACT_APP_API_URL}/api`;

const AccountManagement = () => {
  const { user } = useAuth();
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'users'

  useEffect(() => {
    fetchPendingAccounts();
    if (user?.role === 'SuperUser') {
      fetchAllUsers();
    }
  }, [user]);

  const fetchPendingAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts/pending`);
      setPendingAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch pending accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleReview = async (userId, action) => {
    try {
      await axios.post(`${API}/accounts/review`, {
        user_id: userId,
        action: action
      });
      toast.success(`Account ${action}d successfully!`);
      fetchPendingAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} account`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'SuperUser': 'bg-purple-100 text-purple-800 border-purple-200',
      'VP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Manager': 'bg-gray-700/50 text-gray-200 border-gray-600',
      'SPV': 'bg-green-100 text-green-800 border-green-200',
      'Staff': 'bg-slate-100 text-white border-slate-200'
    };
    return colors[role] || 'bg-slate-100 text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="account-management-page">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Account Management</h1>
        <p className="text-slate-300">
          {user?.role === 'SuperUser'
            ? 'Manage user accounts and approve registrations'
            : `Review and approve pending staff registrations${user?.role === 'Manager' ? ` for ${user.division} division` : ''}`
          }
        </p>
      </div>

      {/* Tabs for SuperUser */}
      {user?.role === 'SuperUser' && (
        <div className="flex space-x-2 border-b pb-2">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-gray-600' : ''}
          >
            <UserCheck size={18} className="mr-2" />
            Pending Approvals ({pendingAccounts.length})
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'bg-gray-600' : ''}
          >
            <Users size={18} className="mr-2" />
            All Users ({allUsers.length})
          </Button>
        </div>
      )}

      {/* Pending Accounts Tab */}
      {(activeTab === 'pending' || user?.role !== 'SuperUser') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingAccounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <UserCheck size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No pending account approvals</p>
            </div>
          ) : (
            pendingAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500" data-testid={`account-card-${account.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{account.username}</CardTitle>
                  <CardDescription className="text-sm">
                    {account.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-300">Role:</p>
                      <p className="text-white">{account.role}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">Division:</p>
                      <p className="text-white">{account.division}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-300 text-sm">Status:</p>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {account.account_status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Registered: {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleReview(account.id, 'approve')}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      data-testid={`approve-${account.id}`}
                    >
                      <Check size={16} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(account.id, 'reject')}
                      variant="outline"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      data-testid={`reject-${account.id}`}
                    >
                      <X size={16} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* All Users Tab (SuperUser only) */}
      {activeTab === 'users' && user?.role === 'SuperUser' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allUsers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            allUsers.map((u) => (
              <Card key={u.id} className="hover:shadow-lg transition-shadow" data-testid={`user-card-${u.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {u.username}
                        {u.role === 'SuperUser' && <Shield size={16} className="text-purple-500" />}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {u.email}
                      </CardDescription>
                    </div>
                    {u.id !== user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-user-${u.id}`}
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(u.role)}>
                      {u.role}
                    </Badge>
                    {u.division && (
                      <Badge variant="outline">{u.division}</Badge>
                    )}
                  </div>
                  <div>
                    <Badge
                      className={u.account_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {u.account_status || 'approved'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
