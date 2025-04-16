import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  selectedFiles?: File[];
  onFileRemove?: (index: number) => void;
  uploadProgress?: number;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  maxFiles = 5,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif']
  },
  selectedFiles = [],
  onFileRemove,
  uploadProgress
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check total files limit
    const totalFiles = selectedFiles.length + acceptedFiles.length;
    if (totalFiles > maxFiles) {
      toast.error(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    // Validate each file
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dosyası 10MB'dan büyük olamaz`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} bir resim dosyası değil`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  }, [onFileSelect, maxFiles, selectedFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - selectedFiles.length,
    accept,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`upload-zone ${
          isDragActive ? 'border-primary-500 bg-primary-50' : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-primary-600">Dosyaları buraya bırakın...</p>
          ) : (
            <>
              <p className="text-gray-600">
                Dosyaları sürükleyip bırakın veya seçmek için tıklayın
              </p>
              <p className="text-sm text-gray-500 mt-2">
                (Maksimum {maxFiles} dosya, her biri en fazla 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedFiles.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Önizleme ${index + 1}`}
                className="h-24 w-full object-cover rounded-lg shadow-md group-hover:opacity-75 transition-opacity"
              />
              {onFileRemove && (
                <button
                  onClick={() => onFileRemove(index)}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {typeof uploadProgress === 'number' && uploadProgress > 0 && (
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-primary-600">
                Yükleniyor
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary-600">
                {Math.round(uploadProgress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
            <div
              style={{ width: `${uploadProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
};