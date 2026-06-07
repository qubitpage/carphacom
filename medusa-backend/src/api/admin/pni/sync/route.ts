/**
 * PNI Sync Management API
 * 
 * Endpoints for triggering manual syncs:
 *   POST /admin/pni/sync { type: "stock-quick" | "price-stock" | "full-import" }
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SYNC_SCRIPTS_DIR = process.env.QP_LEGACY_PNI_SCRIPT_DIR || "/opt/qubitpage/scripts/legacy-pni";
const LOCK_DIR = process.env.QP_LOCK_DIR || "/opt/qubitpage/shared/cache/locks";
const LOG_DIR = process.env.QP_LOG_DIR || "/opt/qubitpage/shared/logs";

interface SyncJob {
  id: string;
  type: "stock-quick" | "price-stock" | "full-import";
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

// In-memory job tracking (in production, use Redis or DB)
const activeJobs: Map<string, SyncJob> = new Map();

// Helper to check if sync is already running
function isSyncRunning(type: string): boolean {
  const lockFiles: Record<string, string> = {
    "stock-quick": "sync_quick.lock",
    "price-stock": "sync_full.lock",
    "full-import": "sync_import.lock"
  };
  
  const lockFile = path.join(LOCK_DIR, lockFiles[type] || "sync.lock");
  
  if (fs.existsSync(lockFile)) {
    try {
      const pid = fs.readFileSync(lockFile, "utf-8").trim();
      process.kill(parseInt(pid), 0);
      return true;
    } catch {
      try { fs.unlinkSync(lockFile); } catch {}
      return false;
    }
  }
  
  return false;
}

// Helper to get script command for sync type
function getSyncCommand(type: string): { script: string; args: string[] } {
  const scripts: Record<string, { script: string; args: string[] }> = {
    "stock-quick": {
      script: path.join(SYNC_SCRIPTS_DIR, "sync_pni_stock_quick.py"),
      args: []
    },
    "price-stock": {
      script: path.join(SYNC_SCRIPTS_DIR, "sync_pni_prices_stock.py"),
      args: []
    },
    "full-import": {
      script: path.join(SYNC_SCRIPTS_DIR, "import_pni_products_romanian.py"),
      args: []
    }
  };
  
  return scripts[type] || scripts["stock-quick"];
}

// Helper to read recent log lines
function getRecentLogs(type: string, lines: number = 50): string {
  const logFiles: Record<string, string> = {
    "stock-quick": "pni_sync_quick.log",
    "price-stock": "pni_sync_full.log",
    "full-import": "pni_sync_import.log"
  };
  
  const logFile = path.join(LOG_DIR, logFiles[type] || "pni_sync.log");
  
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf-8");
      const allLines = content.split("\n");
      return allLines.slice(-lines).join("\n");
    }
  } catch {
    // Ignore read errors
  }
  
  return "";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (process.env.QP_ENABLE_LEGACY_PNI_SYNC !== "true") {
    return res.status(403).json({
      success: false,
      error: "Legacy supplier sync is disabled on QubitPage production"
    });
  }

  const { type = "stock-quick" } = req.body as { type?: string };
  
  const validTypes = ["stock-quick", "price-stock", "full-import"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid sync type. Valid: " + validTypes.join(", ")
    });
  }
  
  if (isSyncRunning(type)) {
    return res.status(409).json({
      success: false,
      error: "Sync " + type + " is already running"
    });
  }
  
  const jobId = type + "-" + Date.now();
  const job: SyncJob = {
    id: jobId,
    type: type as any,
    status: "running",
    startedAt: new Date().toISOString()
  };
  
  activeJobs.set(jobId, job);
  
  const { script, args } = getSyncCommand(type);
  
  console.log("[PNI Sync] Starting " + type + " sync, script: " + script);
  
  const child = spawn("python3", [script, ...args], {
    cwd: SYNC_SCRIPTS_DIR,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  
  let output = "";
  let errorOutput = "";
  
  child.stdout?.on("data", (data) => {
    output += data.toString();
  });
  
  child.stderr?.on("data", (data) => {
    errorOutput += data.toString();
  });
  
  child.on("close", (code) => {
    const updatedJob = activeJobs.get(jobId);
    if (updatedJob) {
      updatedJob.status = code === 0 ? "completed" : "failed";
      updatedJob.completedAt = new Date().toISOString();
      updatedJob.output = output.slice(-5000);
      updatedJob.error = errorOutput.slice(-2000);
      activeJobs.set(jobId, updatedJob);
      console.log("[PNI Sync] " + type + " sync completed with code " + code);
    }
  });
  
  child.unref();
  
  res.json({
    success: true,
    message: type + " sync started",
    data: {
      jobId,
      type,
      status: "running",
      startedAt: job.startedAt,
      estimatedDuration: type === "stock-quick" ? "1-2 minute" :
                         type === "price-stock" ? "3-5 minute" :
                         "10-20 minute"
    }
  });
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const jobId = req.query.jobId as string;
  const type = req.query.type as string;
  
  if (jobId) {
    const job = activeJobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found"
      });
    }
    return res.json({
      success: true,
      data: job
    });
  }
  
  if (type) {
    const running = isSyncRunning(type);
    const logs = getRecentLogs(type);
    
    return res.json({
      success: true,
      data: {
        type,
        isRunning: running,
        recentLogs: logs
      }
    });
  }
  
  const jobs = Array.from(activeJobs.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 20);
  
  const runningStatus = {
    "stock-quick": isSyncRunning("stock-quick"),
    "price-stock": isSyncRunning("price-stock"),
    "full-import": isSyncRunning("full-import")
  };
  
  res.json({
    success: true,
    data: {
      runningStatus,
      recentJobs: jobs
    }
  });
}
