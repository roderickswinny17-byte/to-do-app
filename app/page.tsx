"use client";

import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  CheckCircle,
  Circle,
  Sun,
  Moon,
  X,
  StickyNote,
  ListChecks,
  ClipboardList,
  NotebookPen,
  CheckSquare,
  ListTodo,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface List {
  id: number;
  name: string;
}

interface Todo {
  id: number;
  list_id: number;
  text: string;
  completed: boolean;
}

const DECOR_ICONS: LucideIcon[] = [
  StickyNote,
  ListChecks,
  ClipboardList,
  NotebookPen,
  CheckSquare,
  ListTodo,
];

type DecorItem = {
  Icon: LucideIcon;
  top: number;
  left: number;
  size: number;
  rotate: number;
  duration: number;
  delay: number;
};

function BackgroundDecor() {
  // Generated after mount (not via useMemo) so the random layout is never
  // computed during SSR, which would mismatch the client's own random values.
  const [items, setItems] = useState<DecorItem[]>([]);

  useEffect(() => {
    setItems(
      Array.from({ length: 10 }, (_, i) => ({
        Icon: DECOR_ICONS[i % DECOR_ICONS.length],
        top: Math.random() * 90 + 2,
        left: Math.random() * 92 + 2,
        size: Math.random() * 36 + 36,
        rotate: Math.random() * 40 - 20,
        duration: Math.random() * 4 + 5,
        delay: -Math.random() * 6,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {items.map(({ Icon, top, left, size, rotate, duration, delay }, i) => (
        <Icon
          key={i}
          className="float-icon absolute text-slate-400/20 dark:text-slate-500/15"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: size,
            height: size,
            transform: `rotate(${rotate}deg)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function TodoApp() {
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lists, setLists] = useState<List[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [listsLoading, setListsLoading] = useState(true);
  const [newListName, setNewListName] = useState("");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [input, setInput] = useState("");

  const activeList = lists.find((l) => l.id === activeListId) ?? null;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Load lists on mount. If this shared workspace has no lists yet, bootstrap
  // one default list so there's always somewhere for tasks to go.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("id, name")
        .order("id", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setListsLoading(false);
        return;
      }

      let allLists = data ?? [];

      if (allLists.length === 0) {
        const { data: created, error: createError } = await supabase
          .from("lists")
          .insert({ name: "My Tasks" })
          .select("id, name")
          .single();

        if (cancelled) return;

        if (createError) {
          setError(createError.message);
          setListsLoading(false);
          return;
        }

        allLists = [created];
      }

      setLists(allLists);
      setActiveListId(allLists[0].id);
      setListsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load todos whenever the active list changes.
  useEffect(() => {
    if (activeListId == null) {
      setTodos([]);
      return;
    }

    let cancelled = false;
    setTodosLoading(true);

    supabase
      .from("todos")
      .select("id, list_id, text, completed")
      .eq("list_id", activeListId)
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          setTodos(data ?? []);
        }
        setTodosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeListId]);

  // Create a new list
  const addList = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;

    setNewListName("");

    const { data, error } = await supabase
      .from("lists")
      .insert({ name })
      .select("id, name")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setLists((prev) => [...prev, data]);
    setActiveListId(data.id);
  };

  // Delete a list (and, via ON DELETE CASCADE, all of its tasks)
  const deleteList = async (id: number) => {
    const target = lists.find((l) => l.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Delete "${target.name}" and all its tasks? This can't be undone.`
    );
    if (!confirmed) return;

    const previousLists = lists;
    const previousActiveId = activeListId;
    const remaining = lists.filter((l) => l.id !== id);

    setLists(remaining);
    if (activeListId === id) {
      setActiveListId(remaining[0]?.id ?? null);
    }

    // .select() after delete so we can tell a real 0-row delete apart from
    // an RLS policy silently blocking it (which reports success with no rows).
    const { data: deletedRows, error } = await supabase
      .from("lists")
      .delete()
      .eq("id", id)
      .select("id");

    if (error || !deletedRows || deletedRows.length === 0) {
      setError(
        error?.message ??
        "The list wasn't deleted (likely blocked by a database policy)."
      );
      setLists(previousLists);
      setActiveListId(previousActiveId);
    }
  };

  // Add a new todo to the active list
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || activeListId == null) return;

    setInput("");

    const { data, error } = await supabase
      .from("todos")
      .insert({ text, completed: false, list_id: activeListId })
      .select("id, list_id, text, completed")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setTodos((prev) => [...prev, data]);
  };

  // Toggle completed status
  const toggleTodo = async (id: number) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;

    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );

    const { error } = await supabase
      .from("todos")
      .update({ completed: !target.completed })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setTodos(todos);
    }
  };

  // Delete a todo
  const deleteTodo = async (id: number) => {
    const previous = todos;
    setTodos(todos.filter((todo) => todo.id !== id));

    const { data: deletedRows, error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .select("id");

    if (error || !deletedRows || deletedRows.length === 0) {
      setError(
        error?.message ??
        "The task wasn't deleted (likely blocked by a database policy)."
      );
      setTodos(previous);
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background flex items-center justify-center p-4 text-foreground transition-colors duration-500">
      <BackgroundDecor />

      <Button
        onClick={() => setDarkMode((v) => !v)}
        aria-label="Toggle dark mode"
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 rounded-full"
      >
        {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      <div className="w-full max-w-md bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          {activeList ? activeList.name : "To-Do Lists"}
        </h1>

        {/* Error banner */}
        {error && (
          <p className="text-center text-xs text-destructive bg-destructive/10 rounded-lg py-2 px-3 mb-4">
            {error}
          </p>
        )}

        {listsLoading ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Loading lists...
          </p>
        ) : (
          <>
            {/* List switcher */}
            {lists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {lists.map((list) => (
                  <div key={list.id} className="flex items-center gap-0.5">
                    <Button
                      onClick={() => setActiveListId(list.id)}
                      variant={list.id === activeListId ? "secondary" : "outline"}
                      size="sm"
                      className="rounded-full"
                    >
                      {list.name}
                    </Button>
                    <Button
                      onClick={() => deleteList(list.id)}
                      variant="ghost"
                      size="icon-xs"
                      className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete list ${list.name}`}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* New list form */}
            <form onSubmit={addList} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-input bg-background rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring text-xs"
              />
              <Button
                type="submit"
                size="icon-sm"
                variant="outline"
                aria-label="Add list"
              >
                <Plus className="size-3.5" />
              </Button>
            </form>

            {activeListId == null ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Create a list above to get started.
              </p>
            ) : (
              <>
                {/* Task Input Form */}
                <form onSubmit={addTodo} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Add a new task..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-input bg-background rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring text-sm"
                  />
                  <Button type="submit" size="icon-lg" aria-label="Add task">
                    <Plus className="size-5" />
                  </Button>
                </form>

                {/* Task List */}
                {todosLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Loading tasks...
                  </p>
                ) : todos.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No tasks yet. Add one above!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {todos.map((todo) => (
                      <li
                        key={todo.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border group transition-all"
                      >
                        <Button
                          onClick={() => toggleTodo(todo.id)}
                          variant="ghost"
                          className="flex-1 h-auto justify-start gap-3 px-2 py-1.5 font-normal"
                        >
                          {todo.completed ? (
                            <CheckCircle className="size-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground/50 shrink-0" />
                          )}
                          <span
                            className={`text-sm ${todo.completed
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                              }`}
                          >
                            {todo.text}
                          </span>
                        </Button>

                        <Button
                          onClick={() => deleteTodo(todo.id)}
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Counter Footer */}
                {todos.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Total: {todos.length}</span>
                    <span>
                      Completed: {todos.filter((t) => t.completed).length}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
