#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";

const server = new McpServer({
  name: "kimi-delegate",
  version: "1.0.0",
});

/**
 * Run kimi-cli with the given prompt and working directory.
 * Uses --quiet mode: non-interactive, auto-approves actions, returns final message only.
 */
function runKimi(prompt, workDir, yolo) {
  return new Promise((resolve, reject) => {
    const args = ["--quiet", "-p", prompt];
    if (workDir) {
      args.push("-w", workDir);
    }
    if (!yolo) {
      // Remove --yolo implied by --quiet, use --print instead
      // Actually --quiet implies --print which implies --yolo, so we can't disable it
      // We'll note this in the tool description
    }

    const proc = spawn("kimi-cli", args, {
      cwd: workDir || process.cwd(),
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 600000, // 10 minute timeout
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || "(kimi completed with no output)");
      } else {
        resolve(
          `kimi exited with code ${code}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn kimi-cli: ${err.message}`));
    });

    // Close stdin so kimi doesn't wait for interactive input
    proc.stdin.end();
  });
}

// Main tool: delegate a task to kimi-cli
server.tool(
  "kimi_delegate",
  `Delegate a coding task to Kimi (kimi-cli), an AI coding agent.
Kimi will autonomously execute the task — reading files, writing code, running commands — and return the result.
Use this to offload implementation sub-tasks: writing functions, creating files, fixing bugs, refactoring, etc.
Kimi runs in auto-approve mode and works in the specified directory.
Best for self-contained tasks with clear instructions.`,
  {
    task: z
      .string()
      .describe(
        "Clear, detailed description of the task for Kimi to complete. Be specific about what files to create/edit, what the code should do, and any constraints."
      ),
    work_dir: z
      .string()
      .optional()
      .describe(
        "Working directory for Kimi to operate in. Defaults to the current project directory."
      ),
  },
  async ({ task, work_dir }) => {
    try {
      const result = await runKimi(task, work_dir, true);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error delegating to Kimi: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Research-only tool: ask kimi to investigate/explore without making changes
server.tool(
  "kimi_research",
  `Ask Kimi to research or explore a codebase question without making changes.
Use this for investigation tasks: understanding code, finding patterns, analyzing architecture, reading docs.
Kimi will read files and analyze code but won't write or modify anything.`,
  {
    question: z
      .string()
      .describe(
        "The research question or exploration task for Kimi. Be specific about what you want to understand."
      ),
    work_dir: z
      .string()
      .optional()
      .describe("Working directory for Kimi to explore."),
  },
  async ({ question, work_dir }) => {
    const prompt = `IMPORTANT: This is a READ-ONLY research task. Do NOT create, edit, or delete any files. Only read and analyze.\n\n${question}`;
    try {
      const result = await runKimi(prompt, work_dir, true);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
