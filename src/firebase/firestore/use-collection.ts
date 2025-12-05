
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  Query,
  DocumentData,
  query,
  where,
  collectionGroup,
  FirestoreError,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

// A custom hook to get a collection from Firestore.
// T is the type of the documents in the collection.
// path is the path to the collection.
// The uid filter has been temporarily removed to show all data.
export function useCollection<T>(path: string, uid?: string | null) {
  const firestore = useFirestore();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // If we don't have a firestore instance, don't do anything.
    if (!firestore) {
        setLoading(false);
        return;
    };
    
    // The reference to the collection.
    const colRef = collection(firestore, path);
    
    // TEMPORARY FIX: Fetch all documents in the collection without filtering by uid.
    // This allows seeing all data, even legacy data without a `uid` field.
    const q: Query<DocumentData> = colRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Map the documents to the specified type and include the document ID.
        const mappedData = snapshot.docs.map((doc) => {
            const docData = doc.data();
            // Convert Firestore Timestamps to ISO strings
            if (docData.date && docData.date instanceof Timestamp) {
                docData.date = docData.date.toDate().toISOString();
            }
            if (docData.orderDate && docData.orderDate instanceof Timestamp) {
                docData.orderDate = docData.orderDate.toDate().toISOString();
            }
            return { ...docData, id: doc.id } as T;
        });
        setData(mappedData);
        setLoading(false);
      },
      (err) => {
        // If there's an error, emit a permission error and update the state.
        const permissionError = new FirestorePermissionError({
          path: colRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    // Unsubscribe from the snapshot listener when the component unmounts.
    return () => unsubscribe();
  }, [firestore, path]); // uid is removed from dependencies

  return { data, loading, error };
}
