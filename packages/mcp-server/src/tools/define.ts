// The single bridge from a typed ToolDescriptor to the erased registry entry. The one cast lives
// here and is sound: the SDK validates `inputSchema` before `handler` is invoked.
import type { z } from "zod";
import type { AnyToolDescriptor, ToolDescriptor } from "./types.js";

/** Define a tool with full inference on `args`; returns the registry-ready erased descriptor. */
export function defineTool<Shape extends z.ZodRawShape>(
  tool: ToolDescriptor<Shape>,
): AnyToolDescriptor {
  return tool as unknown as AnyToolDescriptor;
}
