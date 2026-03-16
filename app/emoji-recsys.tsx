"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useEmojiRecommendations } from "emoji-recsys";
import { EmojiSpinner } from "./emoji-spinner";

export function EmojiPicker({ nEmojis }: { nEmojis: number }) {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState("");
  const searchQuery = selectedText || query;
  const {
    results,
    loading,
    // error,
  } = useEmojiRecommendations(searchQuery, nEmojis);

  const resizeTextarea = useCallback((ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    const maxH = 128;
    const h = Math.min(ta.scrollHeight, maxH);
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
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
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-zinc-400">No emojis found.</p>
      )}
    </div>
  );
}
