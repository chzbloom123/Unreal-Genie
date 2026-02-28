import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  setDoc,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase.config';
import type { Series, CreateSeriesData, UpdateSeriesData, FormatType } from '@/types';

const SERIES_COLLECTION = 'series';
const PAGES_SUBCOLLECTION = 'pages';

// Convert Firestore timestamp to Date
const convertTimestamps = (data: any): Series => ({
  ...data,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all series
export const getAllSeries = async (): Promise<Series[]> => {
  const q = query(
    collection(db, SERIES_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...convertTimestamps(doc.data()),
    series_id: doc.id,
  } as Series));
};

// Get series by format type
export const getSeriesByFormat = async (formatType: FormatType | 'all'): Promise<Series[]> => {
  if (formatType === 'all') {
    return getAllSeries();
  }
  
  const q = query(
    collection(db, SERIES_COLLECTION),
    where('formatType', '==', formatType),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...convertTimestamps(doc.data()),
    series_id: doc.id,
  } as Series));
};

// Get single series by ID
export const getSeriesById = async (seriesId: string): Promise<Series | null> => {
  const docRef = doc(db, SERIES_COLLECTION, seriesId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    ...convertTimestamps(docSnap.data()),
    series_id: docSnap.id,
  } as Series;
};

// Upload cover image to Firebase Storage
const uploadCoverImage = async (seriesId: string, file: File): Promise<string> => {
  const webpFile = await convertToWebP(file);
  const storageRef = ref(storage, `comics/${seriesId}/cover.webp`);
  await uploadBytes(storageRef, webpFile);
  return getDownloadURL(storageRef);
};

// Convert image to WebP format
const convertToWebP = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP conversion failed'));
          }
        },
        'image/webp',
        0.9
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Create new series
export const createSeries = async (data: CreateSeriesData): Promise<Series> => {
  const now = Timestamp.now();
  
  // Upload cover image
  const coverImageUrl = await uploadCoverImage(data.series_id, data.coverImage);
  
  const seriesData = {
    title: data.title,
    description: data.description,
    formatType: data.formatType,
    coverImageUrl,
    status: data.status,
    totalPageCount: 0,
    contentWarnings: data.contentWarnings || '',
    createdAt: now,
    updatedAt: now,
  };
  
  // Use setDoc with the provided series_id as the document ID
  await setDoc(doc(db, SERIES_COLLECTION, data.series_id), seriesData);
  
  return {
    ...seriesData,
    series_id: data.series_id,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  } as Series;
};

// Update series
export const updateSeries = async (
  seriesId: string,
  data: UpdateSeriesData
): Promise<Series> => {
  const seriesRef = doc(db, SERIES_COLLECTION, seriesId);
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };
  
  if (data.title) updateData.title = data.title;
  if (data.description) updateData.description = data.description;
  if (data.formatType) updateData.formatType = data.formatType;
  if (data.status) updateData.status = data.status;
  if (data.contentWarnings !== undefined) updateData.contentWarnings = data.contentWarnings;
  
  // Upload new cover image if provided
  if (data.coverImage) {
    updateData.coverImageUrl = await uploadCoverImage(seriesId, data.coverImage);
  }
  
  await updateDoc(seriesRef, updateData);
  
  // Return updated series
  const updated = await getSeriesById(seriesId);
  if (!updated) {
    throw new Error('Series not found after update');
  }
  return updated;
};

// Delete series and all its pages
export const deleteSeries = async (seriesId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Delete all pages in the subcollection
  const pagesQuery = query(collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION));
  const pagesSnapshot = await getDocs(pagesQuery);
  
  pagesSnapshot.docs.forEach(pageDoc => {
    batch.delete(pageDoc.ref);
  });
  
  // Delete the series document
  batch.delete(doc(db, SERIES_COLLECTION, seriesId));
  
  await batch.commit();
  
  // Delete cover image from storage
  try {
    const coverRef = ref(storage, `comics/${seriesId}/cover.webp`);
    await deleteObject(coverRef);
  } catch (error) {
    console.warn('Could not delete cover image:', error);
  }
  
  // Delete all page images from storage
  const deletePromises = pagesSnapshot.docs.map(async (pageDoc) => {
    try {
      const pageData = pageDoc.data();
      if (pageData.imageUrl) {
        const imageRef = ref(storage, pageData.imageUrl);
        await deleteObject(imageRef);
      }
    } catch (error) {
      console.warn('Could not delete page image:', error);
    }
  });
  
  await Promise.all(deletePromises);
};

// Update total page count for a series
export const updateTotalPageCount = async (seriesId: string): Promise<number> => {
  const pagesQuery = query(
    collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION)
  );
  const pagesSnapshot = await getDocs(pagesQuery);
  const count = pagesSnapshot.size;
  
  await updateDoc(doc(db, SERIES_COLLECTION, seriesId), {
    totalPageCount: count,
    updatedAt: Timestamp.now(),
  });
  
  return count;
};

// Check if series has any pages (used to lock series_id editing)
export const seriesHasPages = async (seriesId: string): Promise<boolean> => {
  const pagesQuery = query(
    collection(db, SERIES_COLLECTION, seriesId, PAGES_SUBCOLLECTION),
    limit(1)
  );
  const pagesSnapshot = await getDocs(pagesQuery);
  return !pagesSnapshot.empty;
};
