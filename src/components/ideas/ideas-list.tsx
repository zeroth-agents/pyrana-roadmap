"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface IdeasListProps {
  ideas: IdeaData[];
  pillars: Pillar[];
  onSelectIdea: (id: string) => void;
}

export function IdeasList({ ideas, pillars, onSelectIdea }: IdeasListProps) {
  if (ideas.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">No ideas yet. Be the first to share one!</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Pillar</TableHead>
          <TableHead className="text-center">Votes</TableHead>
          <TableHead className="text-center">Comments</TableHead>
          <TableHead className="text-center">Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ideas.map((idea) => {
          const pillar = pillars.find((p) => p.id === idea.pillarId);
          return (
            <TableRow
              key={idea.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectIdea(idea.id)}
            >
              <TableCell className="font-medium">{idea.title}</TableCell>
              <TableCell className="text-muted-foreground">{idea.authorName}</TableCell>
              <TableCell>
                {pillar ? (
                  <Badge variant="outline" className="text-[10px]">
                    {pillar.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">{idea.voteCount}</TableCell>
              <TableCell className="text-center">{idea.commentCount}</TableCell>
              <TableCell className="text-center">
                {idea.priorityScore ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-0">
                    P{idea.priorityScore}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    idea.status === "promoted"
                      ? "bg-green-500/10 text-green-600 border-0 text-[10px]"
                      : idea.status === "archived"
                        ? "bg-muted text-muted-foreground border-0 text-[10px]"
                        : "bg-primary/10 text-primary border-0 text-[10px]"
                  }
                >
                  {idea.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(idea.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
