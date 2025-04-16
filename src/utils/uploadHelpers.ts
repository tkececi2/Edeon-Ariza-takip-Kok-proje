import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import toast from 'react-hot-toast';

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Maximum dimensions
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;

      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => resolve(file);
  });
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Dosya boyutu 10MB\'dan büyük olamaz');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Sadece resim dosyaları yüklenebilir');
    }

    // Compress image
    const compressedFile = await compressImage(file);
    
    // Generate safe filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fullPath = `${path}/${timestamp}_${safeName}`;
    
    // Create storage reference
    const storageRef = ref(storage, fullPath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, compressedFile, {
      contentType: compressedFile.type,
      customMetadata: {
        originalName: file.name,
        timestamp: timestamp.toString()
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('Dosya yükleme hatası:', error);
    throw error;
  }
};

export const uploadMultipleFiles = async (
  files: File[],
  path: string,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  let completed = 0;

  try {
    for (const file of files) {
      try {
        const url = await uploadFile(file, path);
        urls.push(url);
        completed++;
        
        if (onProgress) {
          onProgress((completed / files.length) * 100);
        }
      } catch (error) {
        toast.error(`${file.name} yüklenirken hata oluştu`);
      }
    }

    if (urls.length === 0) {
      throw new Error('Hiçbir dosya yüklenemedi');
    }

    if (urls.length < files.length) {
      toast.warning(`${files.length - urls.length} dosya yüklenemedi`);
    }

    return urls;
  } catch (error) {
    console.error('Toplu yükleme hatası:', error);
    throw error;
  }
};