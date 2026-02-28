// Firebase Data Schema Types for Unreal Genie

export type FormatType = 'graphic_novel' | '4_panel';
export type SeriesStatus = 'ongoing' | 'completed';

export interface Series {
  series_id: string;
  title: string;
  description: string;
  formatType: FormatType;
  coverImageUrl: string;
  status: SeriesStatus;
  totalPageCount: number;
  contentWarnings?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  page_id: string;
  pageNumber: number;
  imageUrl: string;
  altText?: string;
  transcript?: string;
  artistNotes?: string;
  uploadedAt: Date;
  updatedAt: Date;
}

// Form data types for admin operations
export interface CreateSeriesData {
  title: string;
  series_id: string;
  description: string;
  formatType: FormatType;
  status: SeriesStatus;
  coverImage: File;
  contentWarnings?: string;
}

export interface UpdateSeriesData {
  title?: string;
  description?: string;
  formatType?: FormatType;
  status?: SeriesStatus;
  coverImage?: File;
  contentWarnings?: string;
}

export interface CreatePageData {
  seriesId: string;
  image: File;
  pageNumber?: number;
  altText?: string;
  transcript?: string;
  artistNotes?: string;
}

export interface UpdatePageData {
  image?: File;
  pageNumber?: number;
  altText?: string;
  transcript?: string;
  artistNotes?: string;
}

// Viewer state types
export interface ViewerState {
  series: Series | null;
  currentPage: Page | null;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

// Filter types
export type FormatFilter = FormatType | 'all';
