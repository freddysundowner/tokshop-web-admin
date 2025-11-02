import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface ImageUploaderProps {
  value: string[];
  onChange: (images: string[]) => void;
  onFilesChange?: (files: File[]) => void; // For temporary file storage
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  accept?: string;
  disabled?: boolean;
  allowFileStorage?: boolean; // If true, stores files instead of uploading immediately
}

export function ImageUploader({
  value = [],
  onChange,
  onFilesChange,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  accept = "image/*",
  disabled = false,
  allowFileStorage = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: File[]) => {
    if (disabled || uploading) return;

    // Filter valid image files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} is not an image`);
        return false;
      }
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Check if adding these files would exceed maxFiles
    const currentCount = allowFileStorage ? tempFiles.length : value.length;
    const remainingSlots = maxFiles - currentCount;
    const filesToProcess = validFiles.slice(0, remainingSlots);

    if (allowFileStorage) {
      // Store files temporarily without uploading
      const newTempFiles = [...tempFiles, ...filesToProcess];
      setTempFiles(newTempFiles);
      onFilesChange?.(newTempFiles);
      
      // Create preview URLs for display
      const previewUrls = filesToProcess.map(file => URL.createObjectURL(file));
      onChange([...value, ...previewUrls]);
      
      return;
    }

    // Upload immediately (for edit mode or when product ID is available)
    setUploading(true);

    try {
      const uploadPromises = filesToProcess.map(async (file) => {
        try {
          // Generate unique filename
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;
          
          // Create Firebase storage reference
          const imageRef = ref(storage, `product-images/${uniqueFilename}`);
          
          // Upload file to Firebase Storage
          const uploadResult = await uploadBytes(imageRef, file);
          
          // Get download URL
          const downloadURL = await getDownloadURL(uploadResult.ref);
          
          return downloadURL;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(url => url !== null) as string[];

      if (successfulUploads.length > 0) {
        onChange([...value, ...successfulUploads]);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    if (disabled || uploading) return;
    const newImages = [...value];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const canUploadMore = value.length < maxFiles;

  return (
    <div className="space-y-4" data-testid="image-uploader">
      {/* Upload Area */}
      {canUploadMore && (
        <Card className={`border-2 border-dashed transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}>
          <CardContent 
            className="p-6"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Upload product images</h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop images here, or click to select files
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, GIF up to {Math.round(maxFileSize / 1024 / 1024)}MB each
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-images"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Select Images'}
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                disabled={disabled || uploading}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  data-testid={`image-preview-${index}`}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                  disabled={disabled || uploading}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status */}
      {value.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{value.length} of {maxFiles} images uploaded</span>
          {!canUploadMore && (
            <Badge variant="secondary">Maximum images reached</Badge>
          )}
        </div>
      )}
    </div>
  );
}