import { useState, useEffect, useCallback, useMemo } from 'react';
import { Snippet } from '@/types';

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSnippets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/snippets');
      const data = await res.json();
      if (data.success) {
        setSnippets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const addSnippet = useCallback(async (snippet: Omit<Snippet, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snippet),
      });
      const data = await res.json();
      
      if (data.success) {
        setSnippets((prev) => [data.data, ...prev]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add snippet:', error);
      return false;
    }
  }, []);

  const updateSnippet = useCallback(async (id: string, updatedData: Partial<Omit<Snippet, 'id' | 'createdAt'>>) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();

      if (data.success) {
        setSnippets((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, ...data.data } : s
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update snippet:', error);
      return false;
    }
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete snippet:', error);
      return false;
    }
  }, []);

  const filteredSnippets = useMemo(() => {
    if (!searchQuery.trim()) return snippets;
    const query = searchQuery.toLowerCase();
    return snippets.filter((snippet) => {
      return (
        snippet.title.toLowerCase().includes(query) ||
        snippet.content.toLowerCase().includes(query) ||
        snippet.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [snippets, searchQuery]);

  return {
    snippets: filteredSnippets,
    searchQuery,
    setSearchQuery,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    isLoading,
  };
}
