import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Upload as UploadIcon, X, File, Image } from "lucide-react";

export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  percent?: number;
  response?: any;
  error?: any;
}

export interface UploadProps {
  accept?: string;
  multiple?: boolean;
  maxCount?: number;
  maxSize?: number; // in bytes
  fileList?: UploadFile[];
  onChange?: (fileList: UploadFile[]) => void;
  onPreview?: (file: UploadFile) => void;
  onRemove?: (file: UploadFile) => void;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  customRequest?: (options: {
    file: File;
    onProgress: (percent: number) => void;
    onSuccess: (response: any) => void;
    onError: (error: any) => void;
  }) => void;
  disabled?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  showUploadList?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Upload({
  accept,
  multiple = false,
  maxCount = 1,
  maxSize,
  fileList = [],
  onChange,
  onPreview,
  onRemove,
  beforeUpload,
  customRequest,
  disabled = false,
  listType = 'text',
  showUploadList = true,
  className,
  children
}: UploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || disabled) return;

    const newFiles: UploadFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (maxSize && file.size > maxSize) {
        console.warn(`File ${file.name} exceeds maximum size of ${maxSize} bytes`);
        continue;
      }
      
      // Check max count
      if (fileList.length + newFiles.length >= maxCount) {
        console.warn(`Maximum file count of ${maxCount} reached`);
        break;
      }
      
      // Before upload check
      if (beforeUpload) {
        const result = await beforeUpload(file);
        if (!result) continue;
      }
      
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${i}`,
        name: file.name,
        status: 'uploading',
        percent: 0
      };
      
      newFiles.push(uploadFile);
      
      // Start upload
      if (customRequest) {
        customRequest({
          file,
          onProgress: (percent) => {
            const updatedFiles = [...fileList, ...newFiles];
            const targetFile = updatedFiles.find(f => f.uid === uploadFile.uid);
            if (targetFile) {
              targetFile.percent = percent;
              onChange?.(updatedFiles);
            }
          },
          onSuccess: (response) => {
            const updatedFiles = [...fileList, ...newFiles];
            const targetFile = updatedFiles.find(f => f.uid === uploadFile.uid);
            if (targetFile) {
              targetFile.status = 'done';
              targetFile.response = response;
              targetFile.url = response?.url || URL.createObjectURL(file);
              onChange?.(updatedFiles);
            }
          },
          onError: (error) => {
            const updatedFiles = [...fileList, ...newFiles];
            const targetFile = updatedFiles.find(f => f.uid === uploadFile.uid);
            if (targetFile) {
              targetFile.status = 'error';
              targetFile.error = error;
              onChange?.(updatedFiles);
            }
          }
        });
      } else {
        // Default behavior - just mark as done
        uploadFile.status = 'done';
        uploadFile.url = URL.createObjectURL(file);
        uploadFile.percent = 100;
      }
    }
    
    onChange?.([...fileList, ...newFiles]);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (file: UploadFile) => {
    onRemove?.(file);
    const newFileList = fileList.filter(f => f.uid !== file.uid);
    onChange?.(newFileList);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const renderFileList = () => {
    if (!showUploadList || fileList.length === 0) return null;

    if (listType === 'picture-card') {
      return (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {fileList.map(file => (
            <div key={file.uid} className="relative border rounded-lg p-2 bg-muted/30">
              <div className="aspect-square flex items-center justify-center bg-muted rounded">
                {file.url ? (
                  <img 
                    src={file.url} 
                    alt={file.name}
                    className="w-full h-full object-cover rounded cursor-pointer"
                    onClick={() => onPreview?.(file)}
                  />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="mt-1 text-xs truncate">{file.name}</div>
              {file.status === 'uploading' && file.percent !== undefined && (
                <Progress value={file.percent} className="mt-1 h-1" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-background border"
                onClick={() => handleRemove(file)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-2">
        {fileList.map(file => (
          <div key={file.uid} className="flex items-center gap-2 p-2 border rounded">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm truncate">{file.name}</span>
            {file.status === 'uploading' && file.percent !== undefined && (
              <div className="flex items-center gap-2">
                <Progress value={file.percent} className="w-20 h-2" />
                <span className="text-xs text-muted-foreground">{file.percent}%</span>
              </div>
            )}
            {file.status === 'done' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPreview?.(file)}
                className="text-xs"
              >
                预览
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemove(file)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const canUpload = !disabled && (maxCount === 0 || fileList.length < maxCount);

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      
      {canUpload && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {children || (
            <div className="flex flex-col items-center gap-2">
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                点击或拖拽文件到此区域上传
              </div>
              {maxSize && (
                <div className="text-xs text-muted-foreground">
                  最大文件大小: {(maxSize / 1024 / 1024).toFixed(1)}MB
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {renderFileList()}
    </div>
  );
}