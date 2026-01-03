import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Todo, TodoCategory } from '@/types';

export function useTodos() {
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCategories = useCallback(async (newCategories: TodoCategory[]) => {
    setIsSaving(true);
    try {
        const ownedCategories = newCategories.filter(c => c.isOwner !== false);
        const sharedCategories = newCategories.filter(c => c.isOwner === false);

        // 1. Save owned categories
        const res = await fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categories: ownedCategories }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save owned categories");

        if (data.data && data.data.categories) {
            const savedOwned = data.data.categories;
            setCategories(prevCats => {
                const shared = prevCats.filter(c => c.isOwner === false);
                return [...savedOwned, ...shared];
            });
        }

        // 2. Update shared categories individually
        await Promise.all(sharedCategories.map(async (cat) => {
            const updateData = {
                categoryId: cat._id,
                ownerId: cat.ownerId,
                category: {
                    name: cat.name,
                    items: cat.items
                }
            };

            const shareRes = await fetch("/api/todos/category", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            if (!shareRes.ok) console.error(`Failed to update shared category ${cat.name}`);
        }));

    } catch (error) {
      console.error("Error saving todos:", error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((newCategories: TodoCategory[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      saveCategories(newCategories);
    }, 1000);
  }, [saveCategories]);

  const addCategory = useCallback(() => {
    const newCategories: TodoCategory[] = [
        ...categories,
        { name: "New Category", items: [], isOwner: true, sharedWith: [] }
    ];
    setCategories(newCategories);
    saveCategories(newCategories);
  }, [categories, saveCategories]);

  const deleteCategory = useCallback(async (index: number) => {
      const catToDelete = categories[index];
      if (catToDelete.isOwner === false) {
          // Leave shared category
          try {
              const res = await fetch("/api/todos/share", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      categoryId: catToDelete._id,
                      ownerId: catToDelete.ownerId,
                      action: 'leave'
                  })
              });
              if (res.ok) {
                  setCategories(categories.filter((_, i) => i !== index));
              }
          } catch (error) {
              console.error("Error leaving category:", error);
          }
          return;
      }

      const newCategories = categories.filter((_, i) => i !== index);
      setCategories(newCategories);
      saveCategories(newCategories);
  }, [categories, saveCategories]);

  // Add item to a specific category
  const addTodo = useCallback(async (categoryIndex: number, todo: Omit<Todo, 'id' | 'createdAt'>) => {
    const newCategories = [...categories];
    const newTodo = {
        ...todo,
        id: Math.random().toString(36).substring(2, 9), // Temporary ID until saved
        createdAt: new Date()
    } as Todo;

    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: [newTodo, ...newCategories[categoryIndex].items]
    };

    setCategories(newCategories);
    saveCategories(newCategories);
    return true;
  }, [categories, saveCategories]);

  const updateTodo = useCallback(async (categoryIndex: number, todoId: string, updatedData: Partial<Todo>) => {
    const newCategories = [...categories];
    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newCategories[categoryIndex].items.map(t => 
            t.id === todoId ? { ...t, ...updatedData } : t
        )
    };
    setCategories(newCategories);
    debouncedSave(newCategories);
    return true;
  }, [categories, debouncedSave]);

  const deleteTodo = useCallback(async (categoryIndex: number, todoId: string) => {
    const newCategories = [...categories];
    const todoToDelete = newCategories[categoryIndex].items.find(t => t.id === todoId);
    
    if (todoToDelete) {
        // We might want to call a delete endpoint to move it to trash
        try {
            await fetch(`/api/todos/${todoId}`, { method: 'DELETE' }); // This might need update if we want to support trash for nested items
        } catch (e) {
            console.error("Failed to move to trash", e);
        }
    }

    newCategories[categoryIndex] = {
        ...newCategories[categoryIndex],
        items: newCategories[categoryIndex].items.filter(t => t.id !== todoId)
    };
    setCategories(newCategories);
    saveCategories(newCategories);
    return true;
  }, [categories, saveCategories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories.map(cat => {
      const matchesCategory = cat.name.toLowerCase().includes(query);
      const filteredItems = cat.items.filter(item => 
          item.title.toLowerCase().includes(query) || 
          (item.description && item.description.toLowerCase().includes(query))
      );

      if (matchesCategory || filteredItems.length > 0) {
          return { ...cat, items: matchesCategory ? cat.items : filteredItems };
      }
      return null;
    }).filter((c): c is TodoCategory => c !== null);
  }, [categories, searchQuery]);

  return {
    categories: filteredCategories,
    allCategories: categories,
    setCategories,
    searchQuery,
    setSearchQuery,
    addCategory,
    deleteCategory,
    addTodo,
    updateTodo,
    deleteTodo,
    isLoading,
    isSaving,
    saveCategories,
    debouncedSave,
    fetchCategories
  };
}
