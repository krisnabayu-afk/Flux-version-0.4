import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // PHASE 5
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, MapPin, Edit, Trash2, Eye } from 'lucide-react'; // PHASE 5: Added Eye icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Sites = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // PHASE 5
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`);
      setSites(response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode) {
        await axios.put(`${API}/sites/${selectedSite.id}`, formData);
        toast.success('Site updated successfully!');
      } else {
        await axios.post(`${API}/sites`, formData);
        toast.success('Site created successfully!');
      }
      setOpen(false);
      setEditMode(false);
      setSelectedSite(null);
      setFormData({ name: '', location: '', description: '', status: 'active' });
      fetchSites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save site');
    }
  };

  const handleEdit = (site) => {
    setSelectedSite(site);
    setFormData({
      name: site.name,
      location: site.location || '',
      description: site.description || '',
      status: site.status
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this site?')) return;

    try {
      await axios.delete(`${API}/sites/${siteId}`);
      toast.success('Site deleted successfully!');
      fetchSites();
    } catch (error) {
      toast.error('Failed to delete site');
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedSite(null);
    setFormData({ name: '', location: '', description: '', status: 'active' });
    setOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="sites-page">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Site Management</h1>
          <p className="text-slate-600">Manage locations and sites for reports and tickets</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} className="bg-green-500 hover:bg-green-600" data-testid="create-site-button">
              <Plus size={18} className="mr-2" />
              Create Site
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="site-dialog">
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Site' : 'Create New Site'}</DialogTitle>
              <DialogDescription>
                {editMode ? 'Update the site details below.' : 'Fill in the details to create a new site.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="site-name-input"
                  placeholder="VTIB 9999 - Kantor Nakula"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  data-testid="site-location-input"
                  placeholder="Jl. Nakula, No. 123, Badung, Bali, Indonesia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="site-description-input"
                  placeholder="Detail Services Site (BW=100Mbps, FO=CGS)"
                  rows={3}
                />
              </div>

              {editMode && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger data-testid="site-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-500 hover:bg-green-600" data-testid="submit-site-button">
                  {editMode ? 'Update Site' : 'Create Site'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            No sites created yet
          </div>
        ) : (
          sites.map((site) => (
            <Card key={site.id} className="hover:shadow-lg transition-shadow" data-testid={`site-card-${site.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <MapPin size={20} className="text-green-500" />
                    <span>{site.name}</span>
                  </CardTitle>
                  <Badge className={site.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {site.status}
                  </Badge>
                </div>
                {site.location && (
                  <CardDescription className="text-sm">{site.location}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {site.description && (
                  <p className="text-sm text-slate-600">{site.description}</p>
                )}

                <div className="flex items-center space-x-2">
                  {/* PHASE 5: View Details Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/sites/${site.id}`)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    data-testid={`view-site-${site.id}`}
                  >
                    <Eye size={14} className="mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(site)}
                    data-testid={`edit-site-${site.id}`}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(site.id)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    data-testid={`delete-site-${site.id}`}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>

                <p className="text-xs text-slate-400">
                  Created {new Date(site.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Sites;
