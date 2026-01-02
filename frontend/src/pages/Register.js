import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    division: 'Monitoring',
    role: 'Staff'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // FORCE DARK MODE / NAVY THEME
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email domain
    if (!formData.email.toLowerCase().endsWith('@varnion.net.id')) {
      toast.error('Only @varnion.net.id email addresses are allowed');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 text-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/90 rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-gray-700">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="Flux" className="w-full h-full object-contain rounded-xl shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join Flux today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="username">Nama Lengkap</Label>
              <Input
                id="username"
                placeholder="Michael Jordan"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Michael@varnion.net.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="password-input"
              />
            </div>

            {/* Division Field - Now First */}
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={formData.division}
                onValueChange={(value) => {
                  // Auto-set role to Staff for Apps and Fiberzone
                  if (value === 'Apps' || value === 'Fiberzone') {
                    setFormData({ ...formData, division: value, role: 'Staff' });
                  } else {
                    setFormData({ ...formData, division: value });
                  }
                }}
              >
                <SelectTrigger data-testid="division-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="Infra">Infra</SelectItem>
                  <SelectItem value="TS">TS</SelectItem>
                  <SelectItem value="Apps">Apps</SelectItem>
                  <SelectItem value="Fiberzone">Fiberzone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Field - Now Second */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={formData.division === 'Apps' || formData.division === 'Fiberzone'}
              >
                <SelectTrigger data-testid="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="SPV">SPV</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  {/*<SelectItem value="VP">VP</SelectItem>*/}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loading}
              data-testid="register-button"
            >
              {loading ? 'Creating account...' : (
                <>
                  <UserPlus size={18} className="mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-gray-300 hover:text-white font-semibold" data-testid="login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
