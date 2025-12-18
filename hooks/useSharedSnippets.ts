import { useState, useEffect } from 'react';
import { SharedSnippet } from '@/types';

export function useSharedSnippets() {
  const [snippets, setSnippets] = useState<SharedSnippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/shared-snippets');
      const data = await res.json();
      if (data.success) {
        setSnippets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch shared snippets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSnippet = async (snippet: Omit<SharedSnippet, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/shared-snippets', {
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
      console.error('Failed to add shared snippet:', error);
      return false;
    }
  };

  const updateSnippet = async (id: string, updatedData: Partial<Omit<SharedSnippet, 'id' | 'createdAt'>>) => {
    try {
      const res = await fetch(`/api/shared-snippets/${id}`, {
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
      console.error('Failed to update shared snippet:', error);
      return false;
    }
  };

  const deleteSnippet = async (id: string) => {
    try {
      const res = await fetch(`/api/shared-snippets/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete shared snippet:', error);
      return false;
    }
  };

  const filteredSnippets = snippets.filter((snippet) => {
    const query = searchQuery.toLowerCase();
    return (
      snippet.title.toLowerCase().includes(query) ||
      snippet.content.toLowerCase().includes(query) ||
      snippet.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

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

