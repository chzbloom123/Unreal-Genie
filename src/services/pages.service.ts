import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase.config';
import type { Page, CreatePageData, UpdatePageData } from '@/types';

const SERIES_COLLECTION = 'series';
const PAGES_SUBCOLLECTION = 'pages';

// Convert Firestore timestamp to Date
const convertTimestamps = (data: any): Page => ({
  ...data,
  uploadedAt: data.uploadedAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all pages for a series
export const getPagesBySeries = async (seriesId: string): Promise<Page[]> => {
  const q = query(
    collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION),
    orderBy('pageNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...convertTimestamps(doc.data()),
    page_id: doc.id,
  } as Page));
};

// Get a specific page by page number
export const getPageByNumber = async (
  seriesId: string,
  pageNumber: number
): Promise<Page | null> => {
  const q = query(
    collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION),
    where('pageNumber', '==', pageNumber),
    limit(1)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    ...convertTimestamps(doc.data()),
    page_id: doc.id,
  } as Page;
};

// Get a page by its document ID
export const getPageById = async (
  seriesId: string,
  pageId: string
): Promise<Page | null> => {
  const docRef = doc(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION, pageId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    ...convertTimestamps(docSnap.data()),
    page_id: docSnap.id,
  } as Page;
};

// Convert image to WebP and resize if needed
const processImage = async (file: File, maxWidth: number = 1920): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP conversion failed'));
          }
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Upload page image to Firebase Storage
const uploadPageImage = async (
  seriesId: string,
  pageNumber: number,
  file: File
): Promise<string> => {
  const webpBlob = await processImage(file);
  const fileName = pageNumber.toString().padStart(3, '0') + '.webp';
  const storageRef = ref(storage, `comics/${seriesId}/${fileName}`);
  await uploadBytes(storageRef, webpBlob);
  return getDownloadURL(storageRef);
};

// Get the next available page number
const getNextPageNumber = async (seriesId: string): Promise<number> => {
  const pages = await getPagesBySeries(seriesId);
  if (pages.length === 0) return 1;
  
  const maxPage = Math.max(...pages.map(p => p.pageNumber));
  return maxPage + 1;
};

// Create a new page
export const createPage = async (data: CreatePageData): Promise<Page> => {
  const now = Timestamp.now();
  const pageNumber = data.pageNumber || (await getNextPageNumber(data.seriesId));
  
  // Upload image
  const imageUrl = await uploadPageImage(data.seriesId, pageNumber, data.image);
  
  const pageData = {
    pageNumber,
    imageUrl,
    altText: data.altText || '',
    transcript: data.transcript || '',
    artistNotes: data.artistNotes || '',
    uploadedAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(
    collection(db, SERIES_COLLECTION, data.seriesId, PAGES_SUBCOLLECTION),
    pageData
  );
  
  // Update total page count
  const pagesQuery = query(
    collection(db, SERIES_COLLECTION, data.seriesId, PAGES_SUBCOLLECTION)
  );
  const pagesSnapshot = await getDocs(pagesQuery);
  await updateDoc(doc(db, SERIES_COLLECTION, data.seriesId), {
    totalPageCount: pagesSnapshot.size,
    updatedAt: now,
  });
  
  return {
    ...pageData,
    page_id: docRef.id,
    uploadedAt: now.toDate(),
    updatedAt: now.toDate(),
  } as Page;
};

// Bulk upload pages
export const bulkUploadPages = async (
  seriesId: string,
  files: File[],
  startPageNumber?: number
): Promise<Page[]> => {
  const pages: Page[] = [];
  let currentPageNumber = startPageNumber || (await getNextPageNumber(seriesId));
  
  // Sort files by name for consistent ordering
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  
  for (const file of sortedFiles) {
    const page = await createPage({
      seriesId,
      image: file,
      pageNumber: currentPageNumber,
    });
    pages.push(page);
    currentPageNumber++;
  }
  
  return pages;
};

// Update a page
export const updatePage = async (
  seriesId: string,
  pageId: string,
  data: UpdatePageData
): Promise<Page> => {
  const pageRef = doc(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION, pageId);
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };
  
  if (data.pageNumber !== undefined) updateData.pageNumber = data.pageNumber;
  if (data.altText !== undefined) updateData.altText = data.altText;
  if (data.transcript !== undefined) updateData.transcript = data.transcript;
  if (data.artistNotes !== undefined) updateData.artistNotes = data.artistNotes;
  
  // Upload new image if provided
  if (data.image) {
    const currentPage = await getPageById(seriesId, pageId);
    if (currentPage) {
      updateData.imageUrl = await uploadPageImage(
        seriesId,
        data.pageNumber || currentPage.pageNumber,
        data.image
      );
    }
  }
  
  await updateDoc(pageRef, updateData);
  
  // Return updated page
  const updated = await getPageById(seriesId, pageId);
  if (!updated) {
    throw new Error('Page not found after update');
  }
  return updated;
};

// Delete a page
export const deletePage = async (seriesId: string, pageId: string): Promise<void> => {
  // Get page data to delete image
  const page = await getPageById(seriesId, pageId);
  
  if (page) {
    // Delete image from storage
    try {
      const imageRef = ref(storage, page.imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn('Could not delete page image:', error);
    }
  }
  
  // Delete page document
  await deleteDoc(doc(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION, pageId));
  
  // Update total page count
  const pagesQuery = query(
    collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION)
  );
  const pagesSnapshot = await getDocs(pagesQuery);
  await updateDoc(doc(db, SERIES_COLLECTION, seriesId), {
    totalPageCount: pagesSnapshot.size,
    updatedAt: Timestamp.now(),
  });
};

// Reorder pages (update page numbers)
export const reorderPages = async (
  seriesId: string,
  pageOrder: { pageId: string; newPageNumber: number }[]
): Promise<void> => {
  const batch = writeBatch(db);
  const now = Timestamp.now();
  
  pageOrder.forEach(({ pageId, newPageNumber }) => {
    const pageRef = doc(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION, pageId);
    batch.update(pageRef, {
      pageNumber: newPageNumber,
      updatedAt: now,
    });
  });
  
  await batch.commit();
};

// Pre-fetch next page image (for performance)
export const prefetchPageImage = (imageUrl: string): void => {
  const img = new Image();
  img.src = imageUrl;
};
