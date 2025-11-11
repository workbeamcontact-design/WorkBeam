import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';

/**
 * Optimistic updates hook - Makes actions feel instant
 * 
 * Features:
 * - Immediate UI updates
 * - Automatic rollback on error
 * - Queue management for multiple updates
 * - Toast notifications
 */

export interface OptimisticUpdateOptions<T> {
  onMutate: (data: T) => Promise<void> | void;
  onError?: (error: Error, data: T) => void;
  onSuccess?: (data: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface PendingUpdate<T> {
  id: string;
  data: T;
  previousState: any;
}

export const useOptimisticUpdate = <T = any,>() => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate<T>>>(new Map());

  /**
   * Execute an optimistic update
   */
  const execute = useCallback(async <TData = T,>(
    data: TData,
    updateFn: (data: TData) => void,
    options: OptimisticUpdateOptions<TData>
  ) => {
    const updateId = `update-${Date.now()}-${Math.random()}`;
    
    try {
      setIsPending(true);
      setError(null);

      // 1. Apply optimistic update immediately
      const previousState = updateFn(data);

      // 2. Store update for potential rollback
      pendingUpdatesRef.current.set(updateId, {
        id: updateId,
        data: data as any,
        previousState
      });

      // 3. Execute the actual mutation
      await options.onMutate(data);

      // 4. Success - remove from pending
      pendingUpdatesRef.current.delete(updateId);

      // 5. Call success callback
      if (options.onSuccess) {
        options.onSuccess(data);
      }

      // 6. Show success toast
      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      setIsPending(false);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update failed');
      
      // Rollback optimistic update
      const update = pendingUpdatesRef.current.get(updateId);
      if (update && update.previousState) {
        updateFn(update.previousState);
      }

      pendingUpdatesRef.current.delete(updateId);

      // Call error callback
      if (options.onError) {
        options.onError(error, data);
      }

      // Show error toast
      const errorMsg = options.errorMessage || 'Update failed. Please try again.';
      toast.error(errorMsg);

      setError(error);
      setIsPending(false);

      throw error;
    }
  }, []);

  /**
   * Create an optimistic mutation for common operations
   */
  const createMutation = useCallback(<TData = T,>(
    options: OptimisticUpdateOptions<TData>
  ) => {
    return async (data: TData, updateFn: (data: TData) => void) => {
      return execute(data, updateFn, options);
    };
  }, [execute]);

  /**
   * Optimistic create operation
   */
  const optimisticCreate = useCallback(async <TData = T,>(
    item: TData,
    addToList: (item: TData) => void,
    onCreate: (item: TData) => Promise<void>
  ) => {
    const tempId = `temp-${Date.now()}`;
    const itemWithTempId = { ...item, id: tempId } as TData;

    return execute(
      itemWithTempId,
      () => {
        addToList(itemWithTempId);
        return null;
      },
      {
        onMutate: onCreate,
        successMessage: 'Created successfully',
        errorMessage: 'Failed to create. Please try again.'
      }
    );
  }, [execute]);

  /**
   * Optimistic update operation
   */
  const optimisticUpdate = useCallback(async <TData = T,>(
    item: TData,
    updateInList: (item: TData) => TData | void,
    onUpdate: (item: TData) => Promise<void>
  ) => {
    return execute(
      item,
      updateInList,
      {
        onMutate: onUpdate,
        successMessage: 'Updated successfully',
        errorMessage: 'Failed to update. Please try again.'
      }
    );
  }, [execute]);

  /**
   * Optimistic delete operation
   */
  const optimisticDelete = useCallback(async <TData = T,>(
    itemId: string,
    removeFromList: (id: string) => TData | void,
    onDelete: (id: string) => Promise<void>
  ) => {
    return execute(
      itemId as any,
      () => removeFromList(itemId),
      {
        onMutate: async () => onDelete(itemId),
        successMessage: 'Deleted successfully',
        errorMessage: 'Failed to delete. Please try again.'
      }
    );
  }, [execute]);

  return {
    isPending,
    error,
    execute,
    createMutation,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete
  };
};

/**
 * Example usage:
 * 
 * const { optimisticUpdate, isPending } = useOptimisticUpdate();
 * 
 * const handleUpdateClient = async (updatedClient) => {
 *   await optimisticUpdate(
 *     updatedClient,
 *     (client) => {
 *       setClients(prev => prev.map(c => 
 *         c.id === client.id ? client : c
 *       ));
 *       return clients.find(c => c.id === client.id); // previous state
 *     },
 *     api.updateClient
 *   );
 * };
 */