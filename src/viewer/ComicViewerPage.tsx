import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSeriesById, getPageByNumber, getPagesBySeries, prefetchPageImage } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import type { Series, Page } from '@/types';

export const ComicViewerPage = () => {
  const params = useParams<{ seriesId: string; pageNumber: string }>();
  const seriesId = params.seriesId;
  const pageNumber = params.pageNumber;
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  
  const [series, setSeries] = useState<Series | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const currentPageNum = parseInt(pageNumber || '1', 10);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load series and pages
  useEffect(() => {
    if (seriesId) {
      loadData();
    }
  }, [seriesId]);

  // Load current page when page number changes
  useEffect(() => {
    if (seriesId && !isNaN(currentPageNum)) {
      loadCurrentPage();
    }
  }, [seriesId, currentPageNum]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageNum, series?.totalPageCount]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [seriesData, pagesData] = await Promise.all([
        getSeriesById(seriesId!),
        getPagesBySeries(seriesId!)
      ]);
      
      if (seriesData) {
        setSeries(seriesData);
        setAllPages(pagesData);
      } else {
        setError('Series not found');
      }
    } catch (err) {
      setError('Failed to load comic');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPage = async () => {
    if (!seriesId || isNaN(currentPageNum)) return;
    
    try {
      setImageLoading(true);
      const page = await getPageByNumber(seriesId, currentPageNum);
      
      if (page) {
        setCurrentPage(page);
        setError(null);
        
        // Pre-fetch next page
        const nextPage = await getPageByNumber(seriesId, currentPageNum + 1);
        if (nextPage) {
          prefetchPageImage(nextPage.imageUrl);
        }
      } else {
        setError(`Page ${currentPageNum} not found`);
      }
    } catch (err) {
      setError('Failed to load page');
      console.error(err);
    } finally {
      setImageLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (series?.totalPageCount || 1)) {
      navigate(`/comic/${seriesId}/${page}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevious = () => {
    if (currentPageNum > 1) {
      goToPage(currentPageNum - 1);
    }
  };

  const goToNext = () => {
    if (currentPageNum < (series?.totalPageCount || 1)) {
      goToPage(currentPageNum + 1);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJumpError(null);
    
    const targetPage = parseInt(jumpInput, 10);
    
    if (isNaN(targetPage)) {
      setJumpError('Please enter a valid number');
      return;
    }
    
    if (targetPage < 1 || targetPage > (series?.totalPageCount || 1)) {
      setJumpError(`Page must be between 1 and ${series?.totalPageCount}`);
      return;
    }
    
    goToPage(targetPage);
    setJumpInput('');
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    
    touchStartX.current = null;
  };

  const isFirstPage = currentPageNum === 1;
  const isLastPage = currentPageNum === (series?.totalPageCount || 1);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="w-full aspect-[3/4] max-h-[80vh] rounded-lg" />
        <div className="flex justify-center gap-4 mt-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{error || 'Comic Not Found'}</h2>
        <p className="text-muted-foreground mb-6">
          The comic you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  // Mobile vertical scroll mode
  if (isMobile && series.formatType === 'graphic_novel') {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link to={`/series/${seriesId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold text-sm truncate max-w-[200px]">{series.title}</h1>
        </div>

        {/* Vertical Scroll Pages */}
        <div className="space-y-4">
          {allPages.map((page) => (
            <div
              key={page.page_id}
              className="relative bg-muted rounded-lg overflow-hidden"
            >
              <img
                src={page.imageUrl}
                alt={page.altText || `${series.title} - Page ${page.pageNumber}`}
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs">
                Page {page.pageNumber}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <Link to={`/series/${seriesId}`}>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Series Info
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {series.totalPageCount} pages
            </span>
          </div>
        </div>
        <div className="h-20" /> {/* Spacer for fixed bottom nav */}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to={`/series/${seriesId}`}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Series
          </Button>
        </Link>
        <h1 className="font-semibold truncate max-w-[200px] md:max-w-md hidden sm:block">
          {series.title}
        </h1>
      </div>

      {/* Comic Display */}
      <div
        className={`relative bg-muted rounded-lg overflow-hidden ${
          series.formatType === '4_panel'
            ? 'aspect-[4/1] max-h-[300px]'
            : 'aspect-[3/4] max-h-[80vh]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full absolute inset-0" />
          </div>
        )}
        
        {currentPage && (
          <img
            src={currentPage.imageUrl}
            alt={currentPage.altText || `${series.title} - Page ${currentPageNum}`}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageLoading(false)}
          />
        )}

        {/* Tap zones for navigation (desktop only) */}
        {!isMobile && (
          <>
            <button
              onClick={goToPrevious}
              disabled={isFirstPage}
              className="absolute left-0 top-0 bottom-0 w-1/4 opacity-0 hover:opacity-100 disabled:opacity-0 transition-opacity flex items-center justify-start pl-4"
              style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)' }}
            >
              {!isFirstPage && <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />}
            </button>
            <button
              onClick={goToNext}
              disabled={isLastPage}
              className="absolute right-0 top-0 bottom-0 w-1/4 opacity-0 hover:opacity-100 disabled:opacity-0 transition-opacity flex items-center justify-end pr-4"
              style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)' }}
            >
              {!isLastPage && <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />}
            </button>
          </>
        )}
      </div>

      {/* Page Info & Navigation */}
      <div className="mt-6 space-y-4">
        {/* Page Indicator */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {series.title} — Page {currentPageNum} of {series.totalPageCount}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Previous Button */}
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={isFirstPage}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {/* Jump to Page */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Jump to:
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="#"
              className="w-16 text-center"
            />
            <Button type="submit" variant="secondary" size="sm">
              Go
            </Button>
          </form>

          {/* Next Button */}
          <Button
            variant="outline"
            onClick={goToNext}
            disabled={isLastPage}
            className="w-full sm:w-auto"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Jump Error */}
        {jumpError && (
          <Alert variant="destructive" className="max-w-sm mx-auto">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{jumpError}</AlertDescription>
          </Alert>
        )}

        {/* Keyboard Hint */}
        <p className="text-center text-xs text-muted-foreground hidden sm:block">
          Use ← → arrow keys to navigate
        </p>
      </div>

      {/* Transcript (for accessibility & SEO) */}
      {currentPage?.transcript && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Transcript
          </h3>
          <p className="text-sm leading-relaxed">{currentPage.transcript}</p>
        </div>
      )}

      {/* Artist Notes */}
      {currentPage?.artistNotes && (
        <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Artist Notes
          </h3>
          <p className="text-sm italic">{currentPage.artistNotes}</p>
        </div>
      )}
    </div>
  );
};
