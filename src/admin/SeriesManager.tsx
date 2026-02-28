import { useState, useEffect, useCallback } from 'react';
import {
  getAllSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  seriesHasPages
} from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Series, FormatType, SeriesStatus } from '@/types';

export const SeriesManager = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesToDelete, setSeriesToDelete] = useState<Series | null>(null);
  const [hasPages, setHasPages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [description, setDescription] = useState('');
  const [formatType, setFormatType] = useState<FormatType>('graphic_novel');
  const [status, setStatus] = useState<SeriesStatus>('ongoing');
  const [contentWarnings, setContentWarnings] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  const loadSeries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllSeries();
      setSeries(data);
    } catch (error) {
      toast.error('Failed to load series');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const resetForm = () => {
    setTitle('');
    setSeriesId('');
    setDescription('');
    setFormatType('graphic_novel');
    setStatus('ongoing');
    setContentWarnings('');
    setCoverImage(null);
    setCoverPreview('');
    setEditingSeries(null);
    setHasPages(false);
  };

  const handleOpenDialog = async (s?: Series) => {
    if (s) {
      setEditingSeries(s);
      setTitle(s.title);
      setSeriesId(s.series_id);
      setDescription(s.description);
      setFormatType(s.formatType);
      setStatus(s.status);
      setContentWarnings(s.contentWarnings || '');
      setCoverPreview(s.coverImageUrl);
      
      // Check if series has pages to lock series_id editing
      const hasPagesResult = await seriesHasPages(s.series_id);
      setHasPages(hasPagesResult);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const generateSeriesId = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!editingSeries) {
      setSeriesId(generateSeriesId(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingSeries) {
        // Update existing series
        await updateSeries(editingSeries.series_id, {
          title,
          description,
          formatType,
          status,
          contentWarnings,
          coverImage: coverImage || undefined,
        });
        toast.success('Series updated successfully');
      } else {
        // Create new series
        if (!coverImage) {
          toast.error('Cover image is required');
          setIsSubmitting(false);
          return;
        }
        await createSeries({
          title,
          series_id: seriesId,
          description,
          formatType,
          status,
          contentWarnings,
          coverImage,
        });
        toast.success('Series created successfully');
      }
      handleCloseDialog();
      loadSeries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save series');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (s: Series) => {
    setSeriesToDelete(s);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!seriesToDelete) return;

    try {
      await deleteSeries(seriesToDelete.series_id);
      toast.success('Series deleted successfully');
      loadSeries();
    } catch (error) {
      toast.error('Failed to delete series');
    } finally {
      setIsDeleteDialogOpen(false);
      setSeriesToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Series Management</h1>
          <p className="text-muted-foreground">
            Create and manage your comic series
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Series
        </Button>
      </div>

      {/* Series List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No series yet. Create your first series!
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Series
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map((s) => (
            <Card key={s.series_id} className="overflow-hidden">
              <div className="aspect-[3/2] relative bg-muted">
                {s.coverImageUrl ? (
                  <img
                    src={s.coverImageUrl}
                    alt={s.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(s)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClick(s)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{s.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {s.totalPageCount} pages
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {s.formatType === 'graphic_novel' ? 'Graphic Novel' : '4-Panel'}
                  </Badge>
                  <Badge variant={s.status === 'ongoing' ? 'default' : 'outline'}>
                    {s.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? 'Edit Series' : 'Create New Series'}
            </DialogTitle>
            <DialogDescription>
              {editingSeries
                ? 'Update your series details'
                : 'Fill in the details to create a new comic series'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-4">
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-20 h-28 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be converted to WebP automatically
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter series title"
                required
              />
            </div>

            {/* Series ID */}
            <div className="space-y-2">
              <Label htmlFor="seriesId">Series ID (URL slug) *</Label>
              <Input
                id="seriesId"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                placeholder="series-url-slug"
                required
                disabled={hasPages}
              />
              {hasPages && (
                <p className="text-xs text-amber-600">
                  Series ID cannot be changed after pages are published
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter series description"
                required
                rows={3}
              />
            </div>

            {/* Format Type */}
            <div className="space-y-2">
              <Label htmlFor="formatType">Format Type</Label>
              <Select
                value={formatType}
                onValueChange={(v) => setFormatType(v as FormatType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graphic_novel">Graphic Novel</SelectItem>
                  <SelectItem value="4_panel">4-Panel Strip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SeriesStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Warnings */}
            <div className="space-y-2">
              <Label htmlFor="contentWarnings">Content Warnings (optional)</Label>
              <Input
                id="contentWarnings"
                value={contentWarnings}
                onChange={(e) => setContentWarnings(e.target.value)}
                placeholder="e.g., Mild violence, suggestive themes"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : editingSeries
                  ? 'Update Series'
                  : 'Create Series'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{seriesToDelete?.title}"? This will
              permanently delete all {seriesToDelete?.totalPageCount} pages and cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
