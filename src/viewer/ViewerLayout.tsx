import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSeriesByFormat } from '@/services';
import type { Series, FormatFilter } from '@/types';

export const ViewerLayout = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load series on mount
  useEffect(() => {
    loadSeries();
  }, []);

  // Reload series when format filter changes
  useEffect(() => {
    loadSeries();
  }, [formatFilter]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const data = await getSeriesByFormat(formatFilter);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (value: FormatFilter) => {
    setFormatFilter(value);
    setSelectedSeries('');
  };

  const handleSeriesChange = (seriesId: string) => {
    setSelectedSeries(seriesId);
    if (seriesId) {
      navigate(`/series/${seriesId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Unreal Genie
              </span>
            </Link>

            {/* Navigation Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Format Filter */}
              <Select
                value={formatFilter}
                onValueChange={(value) => handleFormatChange(value as FormatFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">View All</SelectItem>
                  <SelectItem value="graphic_novel">Graphic Novel</SelectItem>
                  <SelectItem value="4_panel">4-Panel</SelectItem>
                </SelectContent>
              </Select>

              {/* Series Selector */}
              <Select
                value={selectedSeries}
                onValueChange={handleSeriesChange}
                disabled={loading || series.length === 0}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={loading ? 'Loading...' : 'Select Series'} />
                </SelectTrigger>
                <SelectContent>
                  {series.map((s) => (
                    <SelectItem key={s.series_id} value={s.series_id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Admin Link */}
              <Link
                to="/admin"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Unreal Genie. All rights reserved.</p>
            <p>Original comics & graphic novels</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
