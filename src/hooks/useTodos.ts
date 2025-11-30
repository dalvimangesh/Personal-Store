import { useState, useEffect } from 'react';
import { Todo } from '@/types';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.success) {
        setTodos(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async (todo: Omit<Todo, 'id' | 'createdAt' | 'isCompleted'>) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todo),
      });
      const data = await res.json();
      
      if (data.success) {
        setTodos((prev) => [data.data, ...prev].sort((a, b) => {
             if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
             if (a.priority !== b.priority) return b.priority - a.priority;
             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add todo:', error);
      return false;
    }
  };

  const updateTodo = async (id: string, updatedData: Partial<Omit<Todo, 'id' | 'createdAt'>>) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();

      if (data.success) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, ...data.data } : t
          ).sort((a, b) => {
             if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
             if (a.priority !== b.priority) return b.priority - a.priority;
             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update todo:', error);
      return false;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete todo:', error);
      return false;
    }
  };

  const filteredTodos = todos.filter((todo) => {
    const query = searchQuery.toLowerCase();
    return (
      todo.title.toLowerCase().includes(query) ||
      (todo.description && todo.description.toLowerCase().includes(query))
    );
  });

  return {
    todos: filteredTodos,
    searchQuery,
    setSearchQuery,
    addTodo,
    updateTodo,
    deleteTodo,
    isLoading,
  };
}
