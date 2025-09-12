import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface IframeProps {
  src?: string;
  title?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  loading?: 'lazy' | 'eager';
  sandbox?: string;
  allowFullScreen?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  showHeader?: boolean;
  showRefresh?: boolean;
  showExternalLink?: boolean;
}

export function Iframe({
  src = 'about:blank',
  title = 'Iframe',
  width = '100%',
  height = '400px',
  className,
  loading = 'lazy',
  sandbox,
  allowFullScreen = false,
  onLoad,
  onError,
  showHeader = true,
  showRefresh = true,
  showExternalLink = true
}: IframeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setKey(prev => prev + 1);
  };

  const openInNewTab = () => {
    if (src && src !== 'about:blank') {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div 
      className={cn("border rounded-lg overflow-hidden bg-background", className)}
      style={containerStyle}
    >
      {showHeader && (
        <div className="flex items-center justify-between p-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{title}</span>
            {src && src !== 'about:blank' && (
              <span className="text-xs text-muted-foreground truncate max-w-xs">
                {src}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-6 w-6 p-0"
              >
                <Loader2 className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
            {showExternalLink && src && src !== 'about:blank' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={openInNewTab}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="relative" style={{ height: showHeader ? 'calc(100% - 41px)' : '100%' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <span>加载失败</span>
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                重试
              </Button>
            </div>
          </div>
        )}
        
        <iframe
          key={key}
          src={src}
          title={title}
          width="100%"
          height="100%"
          loading={loading}
          sandbox={sandbox}
          allowFullScreen={allowFullScreen}
          onLoad={handleLoad}
          onError={handleError}
          className="border-0"
          style={{ display: hasError ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}