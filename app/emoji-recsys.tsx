"use client";
import {
  Component,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { useEmojiRecommendations } from "emoji-recsys";
import { EmojiSpinner } from "./emoji-spinner";

const STORAGE_KEY = "emoji-recsys-query";

function usePersistentQuery() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      if (query) {
        sessionStorage.setItem(STORAGE_KEY, query);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [query]);

  return [query, setQuery] as const;
}

class EmojiPickerErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EmojiPicker crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Emoji RecSys
          </h1>
          <p className="text-sm text-red-500">
            Something went wrong. Please refresh the page to try again.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EmojiPicker({ nEmojis }: { nEmojis: number }) {
  return (
    <EmojiPickerErrorBoundary>
      <EmojiPickerInner nEmojis={nEmojis} />
    </EmojiPickerErrorBoundary>
  );
}

function EmojiPickerInner({ nEmojis }: { nEmojis: number }) {
  const [query, setQuery] = usePersistentQuery();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState("");
  const searchQuery = selectedText || query;
  const {
    results,
    loading,
    error,
  } = useEmojiRecommendations(searchQuery, nEmojis);

  const resizeTextarea = useCallback((ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    const maxH = 128;
    const h = Math.min(ta.scrollHeight, maxH);
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }, []);

  // Resize textarea on mount if query was restored from sessionStorage
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta && query) resizeTextarea(ta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use document selectionchange for reliable mobile selection tracking
  useEffect(() => {
    const onSelectionChange = () => {
      const ta = textareaRef.current;
      if (!ta || document.activeElement !== ta) return;
      const { selectionStart, selectionEnd, value } = ta;
      selectionRef.current = { start: selectionStart, end: selectionEnd };
      setSelectedText(
        selectionStart !== selectionEnd
          ? value.slice(selectionStart, selectionEnd)
          : "",
      );
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuery(e.target.value);
      selectionRef.current = {
        start: e.target.selectionStart,
        end: e.target.selectionEnd,
      };
      setSelectedText("");
      resizeTextarea(e.target);
    },
    [resizeTextarea],
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      const { start, end } = selectionRef.current;
      const next = query.slice(0, start) + emoji + query.slice(end);
      const newPos = start + emoji.length;
      setQuery(next);
      setSelectedText("");
      selectionRef.current = { start: newPos, end: newPos };

      // Restore focus and cursor position after React re-renders
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
          resizeTextarea(ta);
        }
      });
    },
    [query, resizeTextarea],
  );

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Emoji RecSys
      </h1>
      <textarea
        ref={textareaRef}
        rows={1}
        value={query}
        onChange={handleChange}
        placeholder="Type to search emojis..."
        className="w-full resize-none overflow-hidden rounded-lg border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
      />
      {results.length > 0 && (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {results.map((r) => (
            <button
              key={r.emoji}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertEmoji(r.emoji)}
              className="flex flex-col items-center gap-1 rounded-xl bg-zinc-100 px-2 py-3 transition-transform hover:scale-105 hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <span className="text-2xl sm:text-3xl">{r.emoji}</span>
              <span className="w-full truncate text-center text-[10px] leading-tight text-zinc-500 sm:text-[11px] dark:text-zinc-400">
                {r.name}
              </span>
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <EmojiSpinner />
          <span>loading emojis</span>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500">
          Failed to load emoji model. Try refreshing the page.
        </p>
      )}
      {!loading && !error && query && results.length === 0 && (
        <p className="text-sm text-zinc-400">No emojis found.</p>
      )}
    </div>
  );
}
