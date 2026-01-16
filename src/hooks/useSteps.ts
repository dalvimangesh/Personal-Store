import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TerminalCommand } from '@/types';

export function useSteps() {
  const [steps, setSteps] = useState<TerminalCommand[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  const fetchSteps = useCallback(async (retryCount = 0) => {
    try {
      if (!hasLoaded.current && retryCount === 0) {
        setIsLoading(true);
      }
      const res = await fetch('/api/steps');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setSteps(data.data);
        setCategoryConfigs(data.categories || []);
        hasLoaded.current = true;
        setIsLoading(false);
      } else {
        // If success is false but no HTTP error, maybe retry?
        if (retryCount < 2) {
             setTimeout(() => fetchSteps(retryCount + 1), 500 * (retryCount + 1));
             return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch steps:', error);
      if (retryCount < 2) {
          setTimeout(() => fetchSteps(retryCount + 1), 1000);
      } else {
          setIsLoading(false);
      }
    } finally {
      if (hasLoaded.current) {
          setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const addStep = useCallback(async (step: Omit<TerminalCommand, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const res = await fetch('/api/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(step),
      });
      const data = await res.json();
      
      if (data.success) {
        setSteps((prev) => [data.data, ...prev]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add step:', error);
      return false;
    }
  }, []);

  const updateStep = useCallback(async (id: string, updatedData: Partial<Omit<TerminalCommand, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const res = await fetch(`/api/steps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();

      if (data.success) {
        setSteps((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ...data.data } : c
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update step:', error);
      return false;
    }
  }, []);

  const deleteStep = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/steps/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setSteps((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete step:', error);
      return false;
    }
  }, []);

  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return steps;
    const query = searchQuery.toLowerCase();
    return steps.filter((step) => {
      return (
        step.title.toLowerCase().includes(query) ||
        (step.command && step.command.toLowerCase().includes(query)) ||
        step.description.toLowerCase().includes(query) ||
        step.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [steps, searchQuery]);

  return {
    steps: filteredSteps,
    searchQuery,
    setSearchQuery,
    addStep,
    updateStep,
    deleteStep,
    isLoading,
    categoryConfigs,
    refresh: () => fetchSteps(0),
  };
}
