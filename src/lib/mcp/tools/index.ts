import { readTools } from "./read";
import { writeTools } from "./write";

export const tools = { ...readTools, ...writeTools };
export type ToolName = keyof typeof tools;
