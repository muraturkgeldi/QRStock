
'use client';
import React from 'react';
import { Label } from './label';
import { Input } from './input';

export default function FormField({ label, placeholder, keyboardType, value, onChangeText }: { label: string; placeholder?: string; keyboardType?: any; value?: string; onChangeText?: (t: string) => void }) {
  return (
    <div className="mb-4">
      <Label className="text-subtext mb-2 block">{label}</Label>
      <Input
        placeholder={placeholder}
        type={keyboardType === 'numeric' ? 'number' : 'text'}
        value={value}
        onChange={e => onChangeText && onChangeText(e.target.value)}
      />
    </div>
  );
}
