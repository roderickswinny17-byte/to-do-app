"use client";

import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  CheckCircle,
  Circle,
  Sun,
  Moon,
  StickyNote,
  ListChecks,
  ClipboardList,
  NotebookPen,
  CheckSquare,
  ListTodo,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Todo {
  id: number;
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Add a new todo
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newTodo: Todo = {
      id: Date.now(),
      text: input.trim(),
      completed: false,
    };

    setTodos([...todos, newTodo]);
    setInput("");
  };

  // Toggle completed status
  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Delete a todo
  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
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
        <h1 className="text-2xl font-bold text-center mb-6">My To-Do List</h1>

        {/* Input Form */}
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
        {todos.length === 0 ? (
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
      </div>
    </div>
  );
}
