import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAllSeries, getPagesBySeries, createPage, deletePage, reorderPages } from '@/services';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Series, Page } from '@/types';

// Sortable page item component
const SortablePageItem = ({
  page,
  onDelete,
}: {
  page: Page;
  onDelete: (page: Page) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.page_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <Card className="overflow-hidden">
        <div className="aspect-[3/4] relative bg-muted">
          <img
            src={page.imageUrl}
            alt={page.altText || `Page ${page.pageNumber}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
            Page {page.pageNumber}
          </div>
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
        <CardContent className="p-2">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => onDelete(page)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const PageManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [series, setSeries] = useState<Series[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(
    searchParams.get('series') || ''
  );
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Upload form state
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [pageNumber, setPageNumber] = useState('');
  const [altText, setAltText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [artistNotes, setArtistNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadSeries = useCallback(async () => {
    try {
      const data = await getAllSeries();
      setSeries(data);
    } catch (error) {
      toast.error('Failed to load series');
    }
  }, []);

  const loadPages = useCallback(async () => {
    if (!selectedSeriesId) return;
    
    try {
      setLoading(true);
      const data = await getPagesBySeries(selectedSeriesId);
      setPages(data);
    } catch (error) {
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSeriesChange = (value: string) => {
    setSelectedSeriesId(value);
    setSearchParams(value ? { series: value } : {});
  };

  const handleSingleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSingleImage(file);
    }
  };

  const handleBulkImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Sort by filename
      const sorted = files.sort((a, b) => a.name.localeCompare(b.name));
      setBulkImages(sorted);
    }
  };

  const handleUpload = async () => {
    if (!selectedSeriesId) {
      toast.error('Please select a series');
      return;
    }

    setIsUploading(true);

    try {
      if (uploadMode === 'single') {
        if (!singleImage) {
          toast.error('Please select an image');
          setIsUploading(false);
          return;
        }

        await createPage({
          seriesId: selectedSeriesId,
          image: singleImage,
          pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
          altText,
          transcript,
          artistNotes,
        });

        toast.success('Page uploaded successfully');
      } else {
        if (bulkImages.length === 0) {
          toast.error('Please select images');
          setIsUploading(false);
          return;
        }

        // Upload each image sequentially
        for (let i = 0; i < bulkImages.length; i++) {
          await createPage({
            seriesId: selectedSeriesId,
            image: bulkImages[i],
          });
        }

        toast.success(`${bulkImages.length} pages uploaded successfully`);
      }

      resetUploadForm();
      setIsUploadDialogOpen(false);
      loadPages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload page(s)');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSingleImage(null);
    setBulkImages([]);
    setPageNumber('');
    setAltText('');
    setTranscript('');
    setArtistNotes('');
  };

  const handleDeleteClick = (page: Page) => {
    setPageToDelete(page);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pageToDelete || !selectedSeriesId) return;

    try {
      await deletePage(selectedSeriesId, pageToDelete.page_id);
      toast.success('Page deleted successfully');
      loadPages();
    } catch (error) {
      toast.error('Failed to delete page');
    } finally {
      setIsDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.page_id === active.id);
      const newIndex = pages.findIndex((p) => p.page_id === over.id);
      
      const newPages = arrayMove(pages, oldIndex, newIndex);
      setPages(newPages);

      // Update page numbers
      setIsReordering(true);
      try {
        const pageOrder = newPages.map((page, index) => ({
          pageId: page.page_id,
          newPageNumber: index + 1,
        }));
        
        await reorderPages(selectedSeriesId, pageOrder);
        toast.success('Pages reordered successfully');
      } catch (error) {
        toast.error('Failed to reorder pages');
        loadPages(); // Revert on error
      } finally {
        setIsReordering(false);
      }
    }
  };

  const selectedSeries = series.find((s) => s.series_id === selectedSeriesId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Page Management</h1>
          <p className="text-muted-foreground">
            Upload and manage comic pages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedSeriesId}
            onValueChange={handleSeriesChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a series" />
            </SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.series_id} value={s.series_id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedSeriesId && (
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Pages
            </Button>
          )}
        </div>
      </div>

      {/* Series Info */}
      {selectedSeries && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {selectedSeries.coverImageUrl && (
                <img
                  src={selectedSeries.coverImageUrl}
                  alt={selectedSeries.title}
                  className="w-16 h-20 object-cover rounded"
                />
              )}
              <div>
                <h2 className="font-semibold">{selectedSeries.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {selectedSeries.formatType === 'graphic_novel'
                      ? 'Graphic Novel'
                      : '4-Panel'}
                  </Badge>
                  <Badge variant={selectedSeries.status === 'ongoing' ? 'default' : 'outline'}>
                    {selectedSeries.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {pages.length} pages
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages Grid */}
      {!selectedSeriesId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a series to view and manage its pages
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No pages yet. Add your first page!
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Pages
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((p) => p.page_id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((page) => (
                <SortablePageItem
                  key={page.page_id}
                  page={page}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isReordering && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <p className="text-center">Updating page order...</p>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Pages</DialogTitle>
            <DialogDescription>
              Upload new pages to {selectedSeries?.title}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'single' | 'bulk')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Upload</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              {/* Single Image Upload */}
              <div className="space-y-2">
                <Label>Image *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleSingleImageChange}
                />
                {singleImage && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {singleImage.name}
                  </p>
                )}
              </div>

              {/* Page Number (optional) */}
              <div className="space-y-2">
                <Label htmlFor="pageNumber">Page Number (optional)</Label>
                <Input
                  id="pageNumber"
                  type="number"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder={`Auto (next: ${pages.length + 1})`}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-assign the next page number
                </p>
              </div>

              {/* Alt Text */}
              <div className="space-y-2">
                <Label htmlFor="altText">Alt Text (for accessibility)</Label>
                <Input
                  id="altText"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe what's happening in this page"
                />
              </div>

              {/* Transcript */}
              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript / Dialogue</Label>
                <Textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Enter dialogue and scene descriptions"
                  rows={3}
                />
              </div>

              {/* Artist Notes */}
              <div className="space-y-2">
                <Label htmlFor="artistNotes">Artist Notes</Label>
                <Textarea
                  id="artistNotes"
                  value={artistNotes}
                  onChange={(e) => setArtistNotes(e.target.value)}
                  placeholder="Private notes about this page"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              {/* Bulk Image Upload */}
              <div className="space-y-2">
                <Label>Images *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBulkImagesChange}
                />
                {bulkImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {bulkImages.length} images selected:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-muted-foreground">
                      {bulkImages.map((file, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {i + 1}
                          </span>
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pages will be assigned in filename order
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetUploadForm();
                setIsUploadDialogOpen(false);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                isUploading ||
                (uploadMode === 'single' ? !singleImage : bulkImages.length === 0)
              }
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete page {pageToDelete?.pageNumber}? This
              action cannot be undone.
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
