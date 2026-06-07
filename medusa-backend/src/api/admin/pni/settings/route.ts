/**
 * PNI Settings API
 * 
 * Manage sync intervals and cron configuration
 *   GET  /admin/pni/settings - Get current settings
 *   POST /admin/pni/settings - Update settings
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SETTINGS_FILE = path.join(process.env.QP_LEGACY_PNI_CONFIG_DIR || "/opt/qubitpage/shared/cache/legacy-pni", "pni_sync_settings.json");
const CRON_FILE = path.join(process.env.QP_LEGACY_PNI_CONFIG_DIR || "/opt/qubitpage/shared/cache/legacy-pni", "pni_sync_cron.txt");
const LEGACY_ENABLED = process.env.QP_ENABLE_LEGACY_PNI_SYNC === "true";

interface SyncSettings {
  stockQuickEnabled: boolean;
  stockQuickInterval: number; // minutes
  priceStockEnabled: boolean;
  priceStockInterval: number; // hours
  fullImportEnabled: boolean;
  fullImportTime: string; // HH:MM format
  lastUpdated: string;
  lastUpdatedBy?: string;
}

const DEFAULT_SETTINGS: SyncSettings = {
  stockQuickEnabled: true,
  stockQuickInterval: 15,
  priceStockEnabled: true,
  priceStockInterval: 2,
  fullImportEnabled: true,
  fullImportTime: "03:00",
  lastUpdated: new Date().toISOString()
};

function loadSettings(): SyncSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("[PNI Settings] Failed to load settings:", err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: SyncSettings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("[PNI Settings] Failed to save settings:", err);
    throw err;
  }
}

function generateCronContent(settings: SyncSettings): string {
  const wrapper = path.join(process.env.QP_LEGACY_PNI_SCRIPT_DIR || "/opt/qubitpage/scripts/legacy-pni", "pni_sync_wrapper.sh");
  const lines: string[] = [
    "# === PNI SYNC JOBS (via wrapper with locking) ==="
  ];
  
  // Stock quick sync
  if (settings.stockQuickEnabled) {
    const interval = Math.max(5, Math.min(60, settings.stockQuickInterval));
    lines.push("# Quick stock sync - every " + interval + " minutes");
    lines.push("*/" + interval + " * * * * " + wrapper + " stock-quick");
  } else {
    lines.push("# Quick stock sync - DISABLED");
  }
  
  lines.push("");
  
  // Price + stock sync
  if (settings.priceStockEnabled) {
    const hours = Math.max(1, Math.min(12, settings.priceStockInterval));
    lines.push("# Full price+stock sync - every " + hours + " hours");
    lines.push("0 */" + hours + " * * * " + wrapper + " price-stock");
  } else {
    lines.push("# Price+stock sync - DISABLED");
  }
  
  lines.push("");
  
  // Full import
  if (settings.fullImportEnabled) {
    const timeParts = settings.fullImportTime.split(":");
    const hour = parseInt(timeParts[0]) || 3;
    const minute = parseInt(timeParts[1]) || 0;
    lines.push("# Full product import - daily at " + settings.fullImportTime);
    lines.push(minute + " " + hour + " * * * " + wrapper + " full-import");
  } else {
    lines.push("# Full import - DISABLED");
  }
  
  return lines.join("\n");
}

function updateCrontab(settings: SyncSettings): void {
  const cronContent = generateCronContent(settings);
  
  // Write to cron file
  fs.writeFileSync(CRON_FILE, cronContent);
  
  // Install crontab
  try {
    execSync("crontab " + CRON_FILE, { encoding: "utf-8" });
    console.log("[PNI Settings] Crontab updated successfully");
  } catch (err) {
    console.error("[PNI Settings] Failed to update crontab:", err);
    throw new Error("Failed to update crontab");
  }
}

function getCurrentCrontab(): string {
  try {
    return execSync("crontab -l", { encoding: "utf-8" });
  } catch {
    return "";
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!LEGACY_ENABLED) {
    return res.status(403).json({
      success: false,
      error: "Legacy supplier sync is disabled on QubitPage production"
    });
  }

  try {
    const settings = loadSettings();
    const currentCrontab = getCurrentCrontab();
    
    res.json({
      success: true,
      data: {
        settings,
        currentCrontab,
        settingsFile: SETTINGS_FILE,
        cronFile: CRON_FILE
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to load settings"
    });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!LEGACY_ENABLED) {
    return res.status(403).json({
      success: false,
      error: "Legacy supplier sync is disabled on QubitPage production"
    });
  }

  try {
    const body = req.body as Partial<SyncSettings>;
    
    // Load current settings
    const currentSettings = loadSettings();
    
    // Merge with new settings
    const newSettings: SyncSettings = {
      stockQuickEnabled: body.stockQuickEnabled ?? currentSettings.stockQuickEnabled,
      stockQuickInterval: body.stockQuickInterval ?? currentSettings.stockQuickInterval,
      priceStockEnabled: body.priceStockEnabled ?? currentSettings.priceStockEnabled,
      priceStockInterval: body.priceStockInterval ?? currentSettings.priceStockInterval,
      fullImportEnabled: body.fullImportEnabled ?? currentSettings.fullImportEnabled,
      fullImportTime: body.fullImportTime ?? currentSettings.fullImportTime,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: "admin"
    };
    
    // Validate intervals
    if (newSettings.stockQuickInterval < 5 || newSettings.stockQuickInterval > 60) {
      return res.status(400).json({
        success: false,
        error: "Stock quick interval must be between 5 and 60 minutes"
      });
    }
    
    if (newSettings.priceStockInterval < 1 || newSettings.priceStockInterval > 12) {
      return res.status(400).json({
        success: false,
        error: "Price stock interval must be between 1 and 12 hours"
      });
    }
    
    // Validate time format
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(newSettings.fullImportTime)) {
      return res.status(400).json({
        success: false,
        error: "Full import time must be in HH:MM format (24h)"
      });
    }
    
    // Save settings
    saveSettings(newSettings);
    
    // Update crontab
    updateCrontab(newSettings);
    
    const currentCrontab = getCurrentCrontab();
    
    res.json({
      success: true,
      message: "Settings saved and crontab updated",
      data: {
        settings: newSettings,
        currentCrontab
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to save settings"
    });
  }
}
