import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSeriesById } from '@/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';
import type { Series } from '@/types';

export const SeriesLandingPage = () => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seriesId) {
      loadSeries();
    }
  }, [seriesId]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSeriesById(seriesId!);
      if (data) {
        setSeries(data);
      } else {
        setError('Series not found');
      }
    } catch (err) {
      setError('Failed to load series');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFormatLabel = (formatType: string) => {
    return formatType === 'graphic_novel' ? 'Graphic Novel' : '4-Panel Strip';
  };

  const getStatusColor = (status: string) => {
    return status === 'ongoing' ? 'bg-green-500' : 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{error || 'Series Not Found'}</h2>
        <p className="text-muted-foreground mb-6">
          The series you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Comics
      </Button>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Cover Image */}
        <div className="relative">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted shadow-lg">
            {series.coverImageUrl ? (
              <img
                src={series.coverImageUrl}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <span className="text-6xl">📚</span>
              </div>
            )}
          </div>
        </div>

        {/* Series Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{series.title}</h1>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">{getFormatLabel(series.formatType)}</Badge>
              <div className="flex items-center gap-1.5 bg-secondary px-2.5 py-0.5 rounded-full">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(series.status)}`} />
                <span className="text-xs font-medium capitalize">{series.status}</span>
              </div>
              <Badge variant="outline">{series.totalPageCount} pages</Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Synopsis
            </h2>
            <p className="text-lg leading-relaxed">{series.description}</p>
          </div>

          {/* Content Warnings */}
          {series.contentWarnings && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Content Warning:</strong> {series.contentWarnings}
              </p>
            </div>
          )}

          {/* Start Reading Button */}
          <div className="pt-4">
            <Link to={`/comic/${series.series_id}/1`}>
              <Button size="lg" className="w-full sm:w-auto">
                <BookOpen className="w-5 h-5 mr-2" />
                Start Reading
              </Button>
            </Link>
          </div>

          {/* Meta Info */}
          <div className="pt-6 border-t text-sm text-muted-foreground">
            <p>First published: {series.createdAt.toLocaleDateString()}</p>
            <p>Last updated: {series.updatedAt.toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
