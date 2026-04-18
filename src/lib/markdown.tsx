"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

export function ProseMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href, ...props }: { children?: ReactNode; href?: string }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-primary/40 hover:decoration-primary"
            {...props}
          >
            {children}
          </a>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
