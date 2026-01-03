import { useState, useEffect, useCallback, useMemo } from 'react';
import { Habit, HabitLog } from '@/types';
import { toast } from 'sonner';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHabits = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/habits');
      const data = await res.json();
      if (data.success) {
        setHabits(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch habits:', error);
      toast.error('Failed to load habits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const addHabit = useCallback(async (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'logs'>) => {
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData),
      });
      const data = await res.json();
      if (data.success) {
        setHabits(prev => [data.data, ...prev]);
        toast.success('Habit created');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add habit:', error);
      toast.error('Failed to create habit');
      return false;
    }
  }, []);

  const updateHabit = useCallback(async (id: string, habitData: Partial<Habit>) => {
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData),
      });
      const data = await res.json();
      if (data.success) {
        setHabits(prev => prev.map(h => h.id === id ? { ...h, ...data.data } : h));
        toast.success('Habit updated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update habit:', error);
      toast.error('Failed to update habit');
      return false;
    }
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setHabits(prev => prev.filter(h => h.id !== id));
        toast.success('Habit deleted');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete habit:', error);
      toast.error('Failed to delete habit');
      return false;
    }
  }, []);

  const toggleHabitLog = useCallback(async (habitId: string, date: string, completed: boolean, value?: number) => {
    try {
      if (completed) {
        const res = await fetch(`/api/habits/${habitId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, value, completed: true }),
        });
        const data = await res.json();
        if (data.success) {
          setHabits(prev => prev.map(h => {
            if (h.id === habitId) {
              const logs = [...(h.logs || [])];
              const logIndex = logs.findIndex(l => l.date === date);
              if (logIndex > -1) {
                logs[logIndex] = data.data;
              } else {
                logs.push(data.data);
              }
              return { ...h, logs };
            }
            return h;
          }));
          return true;
        }
      } else {
        const res = await fetch(`/api/habits/${habitId}/logs?date=${date}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setHabits(prev => prev.map(h => {
            if (h.id === habitId) {
              return {
                ...h,
                logs: (h.logs || []).filter(l => l.date !== date)
              };
            }
            return h;
          }));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle habit log:', error);
      toast.error('Failed to update log');
      return false;
    }
  }, []);

  const filteredHabits = useMemo(() => {
    if (!searchQuery.trim()) return habits;
    const query = searchQuery.toLowerCase();
    return habits.filter(habit => {
      return (
        habit.title.toLowerCase().includes(query) ||
        habit.description?.toLowerCase().includes(query)
      );
    });
  }, [habits, searchQuery]);

  return {
    habits: filteredHabits,
    isLoading,
    searchQuery,
    setSearchQuery,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitLog,
    refreshHabits: fetchHabits,
  };
}

