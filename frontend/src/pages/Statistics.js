import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_API_URL}/api`;

const COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#64748b'  // slate
];

const Statistics = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'
    const [statDimension, setStatDimension] = useState('user'); // 'user' or 'site'

    // Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchStatistics();
    }, [selectedMonth, selectedYear, selectedCategory, statDimension]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API}/activity-categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const endpoint = statDimension === 'user' ? 'user-counts' : 'site-counts';
            let url = `${API}/reports/statistics/${endpoint}?month=${selectedMonth}&year=${selectedYear}`;
            if (selectedCategory && selectedCategory !== "all") {
                url += `&category_id=${selectedCategory}`;
            }

            const response = await axios.get(url);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            toast.error('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Report Statistics</h1>
                    <p className="text-slate-300">Analyze user report submissions</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* Dimension Toggle */}
                    <div className="flex items-center space-x-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                        <Button
                            variant={statDimension === 'user' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setStatDimension('user')}
                            className={statDimension === 'user' ? 'bg-indigo-600' : ''}
                        >
                            By User
                        </Button>
                        <Button
                            variant={statDimension === 'site' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setStatDimension('site')}
                            className={statDimension === 'site' ? 'bg-indigo-600' : ''}
                        >
                            By Site
                        </Button>
                    </div>

                    {/* Chart Type Toggle */}
                    <div className="flex items-center space-x-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                        <Button
                            variant={chartType === 'pie' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setChartType('pie')}
                            className={chartType === 'pie' ? 'bg-gray-600' : ''}
                        >
                            <PieChartIcon size={16} className="mr-2" />
                            Pie
                        </Button>
                        <Button
                            variant={chartType === 'bar' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setChartType('bar')}
                            className={chartType === 'bar' ? 'bg-gray-600' : ''}
                        >
                            <BarChartIcon size={16} className="mr-2" />
                            Bar
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Filters</CardTitle>
                    <CardDescription className="text-slate-400">Filter statistics by time period and category</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Year</Label>
                            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Activity Category</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2 bg-slate-900/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Reports by {statDimension === 'user' ? 'User' : 'Site'}</CardTitle>
                        <CardDescription className="text-slate-400">
                            Showing report submission counts for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                            {selectedCategory !== "all" && ` • Category: ${categories.find(c => c.id === selectedCategory)?.name || 'Unknown'}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px] flex justify-center items-center">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        ) : stats.length === 0 ? (
                            <div className="text-slate-500">No data available for this period</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400} minWidth={300} minHeight={300}>
                                {chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie
                                            data={stats}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={true}
                                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={140}
                                            innerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="hsl(var(--background))"
                                            strokeWidth={2}
                                        >
                                            {stats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                ) : (
                                    <BarChart
                                        data={stats}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 60,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#94a3b8"
                                            angle={-45}
                                            textAnchor="end"
                                            interval={0}
                                            height={60}
                                        />
                                        <YAxis allowDecimals={false} stroke="#94a3b8" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey="value" name="Reports" radius={[4, 4, 0, 0]}>
                                            {stats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Top 5 Reporters Section */}
                <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                            Top 5 {statDimension === 'user' ? 'Reporters' : 'Sites'}
                            <span className="text-xs font-normal text-slate-400">This Month</span>
                        </CardTitle>
                        <CardDescription className="text-slate-400">Most active contributors</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                        ) : stats.length === 0 ? (
                            <p className="text-slate-500 text-center py-10">No rankings available</p>
                        ) : (
                            <div className="space-y-4">
                                {[...stats].sort((a, b) => b.value - a.value).slice(0, 5).map((user, index) => (
                                    <div key={user.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                                                index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                                                    index === 2 ? 'bg-orange-600/20 text-orange-600 border border-orange-600/50' :
                                                        'bg-slate-700/50 text-slate-400'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <span className="font-medium text-slate-200">{user.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-lg font-bold text-gray-300">{user.value}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">Reports</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Statistics;
