import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TerminalCommand } from '@/types';

export function useTerminalCommands() {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  const fetchCommands = useCallback(async () => {
    try {
      if (!hasLoaded.current) {
        setIsLoading(true);
      }
      const res = await fetch('/api/terminal');
      const data = await res.json();
      if (data.success) {
        setCommands(data.data);
        setCategoryConfigs(data.categories || []);
        hasLoaded.current = true;
      }
    } catch (error) {
      console.error('Failed to fetch commands:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const addCommand = useCallback(async (command: Omit<TerminalCommand, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });
      const data = await res.json();
      
      if (data.success) {
        setCommands((prev) => [data.data, ...prev]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add command:', error);
      return false;
    }
  }, []);

  const updateCommand = useCallback(async (id: string, updatedData: Partial<Omit<TerminalCommand, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const res = await fetch(`/api/terminal/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();

      if (data.success) {
        setCommands((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ...data.data } : c
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update command:', error);
      return false;
    }
  }, []);

  const deleteCommand = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/terminal/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setCommands((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete command:', error);
      return false;
    }
  }, []);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    const query = searchQuery.toLowerCase();
    return commands.filter((command) => {
      return (
        command.title.toLowerCase().includes(query) ||
        (command.command && command.command.toLowerCase().includes(query)) ||
        command.description.toLowerCase().includes(query) ||
        command.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [commands, searchQuery]);

  return {
    commands: filteredCommands,
    searchQuery,
    setSearchQuery,
    addCommand,
    updateCommand,
    deleteCommand,
    isLoading,
    categoryConfigs,
    refresh: fetchCommands,
  };
}
