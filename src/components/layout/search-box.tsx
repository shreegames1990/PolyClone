"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

const MAX_QUERY_LENGTH = 100;

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim().slice(0, MAX_QUERY_LENGTH);
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={onSubmit} className="min-w-0 flex-1 md:max-w-2xl" role="search">
      <label className="input h-11 w-full border-none bg-base-200 text-body-sm">
        <Search className="size-4 text-base-content/60" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Search"
          aria-label="Search markets"
          className="grow"
        />
      </label>
    </form>
  );
}
