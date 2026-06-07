/**
 * Patch for @medusajs/fulfillment isDate bug
 * 
 * Problem: The isDate function in node_modules/@medusajs/fulfillment/dist/utils/utils.js
 * uses Date.parse() to check if a value is a date. However, Date.parse() in V8 treats
 * numeric strings as valid dates (e.g., "12400.08" → year 12400, month 08).
 * 
 * This causes shipping option rules with numeric comparisons (lt, gte, etc.) to incorrectly
 * use date comparison instead of number comparison when the cart's item_total happens to
 * look like a valid date string (e.g., 12400.08 = "year 12400, August").
 * 
 * Fix: The isDate function skips numeric values, ensuring they always use number comparison.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', '@medusajs', 'fulfillment', 'dist', 'utils', 'utils.js');

if (!fs.existsSync(filePath)) {
  console.log('[patch] File not found, skipping:', filePath);
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `const isDate = (str) => {
    return !isNaN(Date.parse(str));
};`;

const newCode = `const isDate = (str) => {
    // Avoid treating numeric values as dates (e.g. Date.parse("12400.08") = year 12400 Aug)
    if (typeof str === 'number' || (typeof str === 'string' && str.trim() !== '' && !isNaN(Number(str)))) return false;
    return !isNaN(Date.parse(str));
};`;

if (content.includes(newCode)) {
  console.log('[patch] Already applied: fulfillment isDate fix');
  process.exit(0);
}

if (!content.includes(oldCode)) {
  console.log('[patch] WARNING: Could not find original isDate function. The Medusa version may have changed.');
  process.exit(0);
}

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content, 'utf8');
console.log('[patch] Applied: fulfillment isDate fix');
