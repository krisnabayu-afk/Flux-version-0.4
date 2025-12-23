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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];

const Statistics = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [chartType, setChartType] = useState('pie'); // 'pie' or 'bar'

    // Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchStatistics();
    }, [selectedMonth, selectedYear, selectedCategory]);

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
            let url = `${API}/reports/statistics/user-counts?month=${selectedMonth}&year=${selectedYear}`;
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
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Report Statistics</h1>
                    <p className="text-slate-600">Analyze user report submissions</p>
                </div>

                {/* Chart Type Toggle */}
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border">
                    <Button
                        variant={chartType === 'pie' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('pie')}
                        className={chartType === 'pie' ? 'bg-blue-600' : ''}
                    >
                        <PieChartIcon size={16} className="mr-2" />
                        Pie Chart
                    </Button>
                    <Button
                        variant={chartType === 'bar' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChartType('bar')}
                        className={chartType === 'bar' ? 'bg-blue-600' : ''}
                    >
                        <BarChartIcon size={16} className="mr-2" />
                        Bar Chart
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter statistics by time period and category</CardDescription>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Reports by User</CardTitle>
                        <CardDescription>
                            Showing report submission counts for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                            {selectedCategory !== "all" && ` • Category: ${categories.find(c => c.id === selectedCategory)?.name || 'Unknown'}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] flex justify-center items-center">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        ) : stats.length === 0 ? (
                            <div className="text-slate-500">No data available for this period</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'pie' ? (
                                    <PieChart>
                                        <Pie
                                            data={stats}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {stats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [value, "Reports"]} />
                                        <Legend />
                                    </PieChart>
                                ) : (
                                    <BarChart
                                        data={stats}
                                        margin={{
                                            top: 5,
                                            right: 30,
                                            left: 20,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip formatter={(value, name) => [value, "Reports"]} />
                                        <Legend />
                                        <Bar dataKey="value" name="Reports" fill="#8884d8">
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
            </div>
        </div>
    );
};

export default Statistics;
