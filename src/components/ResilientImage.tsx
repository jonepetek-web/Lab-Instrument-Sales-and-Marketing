import { Microscope } from 'lucide-react';
import { useState } from 'react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
}

export function ResilientImage({ src, alt, title, className = '' }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200/70 to-cyan-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 text-slate-500 dark:text-slate-400 p-4 text-center ${className}`}
      >
        <Microscope className="w-8 h-8 mb-2 text-cyan-600 dark:text-cyan-400" />
        <span className="text-xs font-medium leading-snug line-clamp-2 max-w-[180px]">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
