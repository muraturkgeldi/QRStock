'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Firebase Permission Error:', error);
      
      let description = 'An unexpected error occurred.';
      if (error instanceof FirestorePermissionError) {
        description = `Operation: ${error.context.operation} on path: ${error.context.path} was denied. Check your Firestore Security Rules.`;
      } else if (error.message) {
        description = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: description,
      });

      // For developers, we throw the error in development to show the Next.js error overlay
      if (process.env.NODE_ENV === 'development') {
        // We throw it in a timeout to avoid getting caught by the nearest error boundary
        // and instead let the Next.js overlay handle it.
        setTimeout(() => {
          throw error;
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
