"use client";

import { IdeaCard } from "./idea-card";

interface Pillar {
  id: string;
  name: string;
}

interface IdeaData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  pillarId: string | null;
  status: string;
  priorityScore: number | null;
  voteCount: number;
  commentCount: number;
  userVoted: boolean;
  createdAt: string;
}

interface IdeasGalleryProps {
  ideas: IdeaData[];
  pillars: Pillar[];
  onSelectIdea: (id: string) => void;
  onRefresh: () => void;
}

export function IdeasGallery({ ideas, pillars, onSelectIdea, onRefresh }: IdeasGalleryProps) {
  if (ideas.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">No ideas yet. Be the first to share one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          pillars={pillars}
          onClick={() => onSelectIdea(idea.id)}
          onVoteChange={() => onRefresh()}
        />
      ))}
    </div>
  );
}
