"use client";
import { useState, useEffect } from "react";

const EMOJIS = ["🔍", "✨", "🎯", "🎨", "🌟", "💫", "🔮", "🎪"];

export function EmojiSpinner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % EMOJIS.length);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-block animate-spin text-lg">{EMOJIS[index]}</span>
  );
}
