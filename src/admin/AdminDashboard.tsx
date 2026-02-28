import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSeries } from '@/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, FileImage, Plus, TrendingUp } from 'lucide-react';
import type { Series } from '@/types';

export const AdminDashboard = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllSeries();
      setSeries(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = series.reduce((sum, s) => sum + s.totalPageCount, 0);
  const ongoingSeries = series.filter((s) => s.status === 'ongoing').length;
  const completedSeries = series.filter((s) => s.status === 'completed').length;

  const stats = [
    { label: 'Total Series', value: series.length, icon: BookOpen },
    { label: 'Total Pages', value: totalPages, icon: FileImage },
    { label: 'Ongoing', value: ongoingSeries, icon: TrendingUp },
    { label: 'Completed', value: completedSeries, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your comic collection
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold">
                      {loading ? <Skeleton className="h-9 w-12" /> : stat.value}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/series">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Series
            </Button>
          </Link>
          <Link to="/admin/pages">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Pages
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Series */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Series</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : series.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No series yet. Create your first series to get started!
              </p>
              <Link to="/admin/series">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Series
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {series.slice(0, 5).map((s) => (
              <Card key={s.series_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {s.coverImageUrl ? (
                        <img
                          src={s.coverImageUrl}
                          alt={s.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {s.totalPageCount} pages • Updated{' '}
                          {s.updatedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === 'ongoing' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                      <Link to={`/admin/pages?series=${s.series_id}`}>
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
