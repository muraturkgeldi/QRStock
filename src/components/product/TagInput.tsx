'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({ value, onChange }: TagInputProps) {
  const [tagText, setTagText] = useState('');

  const addTag = () => {
    const v = tagText.trim().toLowerCase();
    if (!v) return;
    if (!value.includes(v)) {
      onChange([...value, v]);
    }
    setTagText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Etiket yazıp Enter'a bas (örn: boru, alüminyum, jet50)"
        value={tagText}
        onChange={(e) => setTagText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="flex items-center gap-1"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 inline-flex"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Henüz etiket yok. Örn: <strong>boru</strong>, <strong>alüminyum</strong>, <strong>jet50</strong>
          </span>
        )}
      </div>
    </div>
  );
}