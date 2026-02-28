import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSeries } from '@/services';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Series } from '@/types';

export const HomePage = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const data = await getAllSeries();
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormatLabel = (formatType: string) => {
    return formatType === 'graphic_novel' ? 'Graphic Novel' : '4-Panel';
  };

  const getStatusColor = (status: string) => {
    return status === 'ongoing' ? 'bg-green-500' : 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-[3/4] w-full" />
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
          No Comics Yet
        </h2>
        <p className="text-muted-foreground">
          Check back soon for new content!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Featured Comics</h1>
        <p className="text-muted-foreground">
          Browse our collection of original comics and graphic novels
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {series.map((s) => (
          <Link key={s.series_id} to={`/series/${s.series_id}`}>
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow cursor-pointer group">
              {/* Cover Image */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                {s.coverImageUrl ? (
                  <img
                    src={s.coverImageUrl}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <span className="text-4xl">📚</span>
                  </div>
                )}
                
                {/* Format Badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-3 left-3"
                >
                  {getFormatLabel(s.formatType)}
                </Badge>
                
                {/* Status Indicator */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(s.status)}`} />
                  <span className="text-xs font-medium capitalize">{s.status}</span>
                </div>
              </div>

              <CardHeader className="pb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{s.title}</h3>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {s.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.totalPageCount} {s.totalPageCount === 1 ? 'page' : 'pages'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
