// ABOUTME: Custom ReactFlow node for file group intermediate layer in the decision tree.
// ABOUTME: Renders between orchestrator and domain agents showing group name, file count, and target agents.

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, type Easing } from "motion/react";
import { FileStack } from "lucide-react";

// -----------------------------------------------------------------------
// Data contract for FileGroupNode. Passed via ReactFlow node `data` field.
// -----------------------------------------------------------------------
export interface FileGroupNodeData {
  groupId: string;
  groupName: string;
  fileCount: number;
  sharedContext: string;
  targetAgents: string[];
  isActive: boolean;
  onNodeClick: (groupId: string) => void;
  [key: string]: unknown; // ReactFlow requires index signature on node data
}

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
export const FILE_GROUP_NODE_WIDTH = 240;
export const FILE_GROUP_NODE_HEIGHT = 80;

const EASE_OUT: Easing = [0.0, 0.0, 0.2, 1.0];

// -----------------------------------------------------------------------
// FileGroupNode Component
// -----------------------------------------------------------------------
function FileGroupNodeInner({ data }: NodeProps) {
  const { groupId, groupName, fileCount, targetAgents, isActive, onNodeClick } =
    data as unknown as FileGroupNodeData;

  const handleClick = () => {
    onNodeClick(groupId);
  };

  // Handle styles
  const handleStyle = isActive
    ? {
        background: "hsl(var(--cc-accent))",
        width: 7,
        height: 7,
        border: "none",
      }
    : {
        background: "hsl(0 0% 50% / 0.4)",
        width: 5,
        height: 5,
        border: "none",
      };

  return (
    <>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <div
        className="w-[240px] h-[80px]"
        style={{ width: FILE_GROUP_NODE_WIDTH, height: FILE_GROUP_NODE_HEIGHT }}
      >
        <motion.div
          className="relative w-full h-full rounded-lg overflow-hidden cursor-pointer"
          style={{
            background: isActive
              ? "hsl(260 30% 22% / 0.5)"
              : "hsl(0 0% 14% / 0.7)",
            border: isActive
              ? "1.5px solid hsl(var(--cc-accent) / 0.6)"
              : "1px solid hsl(0 0% 50% / 0.3)",
            boxShadow: isActive
              ? "0 0 12px hsl(var(--cc-accent) / 0.15)"
              : "none",
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center justify-center h-full px-3 py-2 gap-1">
            {/* Group name + icon */}
            <div className="flex items-center gap-1.5">
              <FileStack
                className="w-3.5 h-3.5 shrink-0"
                style={{
                  color: isActive
                    ? "hsl(var(--cc-accent))"
                    : "hsl(0 0% 50% / 0.5)",
                }}
              />
              <span
                className="text-sm font-bold truncate max-w-[180px]"
                style={{
                  color: isActive
                    ? "hsl(var(--cc-accent))"
                    : "hsl(0 0% 50% / 0.6)",
                }}
              >
                {groupName}
              </span>
            </div>

            {/* File count badge + target agents */}
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: isActive
                    ? "hsl(var(--cc-accent) / 0.15)"
                    : "hsl(0 0% 50% / 0.1)",
                  color: isActive
                    ? "hsl(var(--cc-accent-glow))"
                    : "hsl(0 0% 50% / 0.5)",
                }}
              >
                {fileCount} {fileCount === 1 ? "file" : "files"}
              </span>

              {targetAgents.length > 0 && (
                <span
                  className="text-[10px] truncate max-w-[100px]"
                  style={{ color: "hsl(0 0% 50% / 0.5)" }}
                >
                  {targetAgents.join(", ")}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export const FileGroupNode = memo(FileGroupNodeInner);
