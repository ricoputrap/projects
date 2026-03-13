#!/usr/bin/env node

/**
 * Auto-generate schema documentation from Prisma schema.prisma
 * Run: node scripts/generate-schema-docs.js
 * Output: docs/generated/schema.prisma.md
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, '../backend/prisma/schema.prisma');
const OUTPUT_FILE = path.join(__dirname, '../docs/generated/schema.prisma.md');

function parseSchema() {
  const content = fs.readFileSync(SCHEMA_FILE, 'utf8');

  // Extract model definitions
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  const models = {};
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];

    models[name] = {
      name,
      fields: [],
      attributes: []
    };

    // Parse fields
    const fieldRegex = /^\s+(\w+)\s+(\w+(?:\[.*?\])?)(.*?)$/gm;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const attributes = fieldMatch[3].trim();

      // Skip decorators
      if (fieldName.startsWith('@@') || fieldName.startsWith('@')) {
        continue;
      }

      models[name].fields.push({
        name: fieldName,
        type: fieldType,
        attributes: attributes
      });
    }

    // Parse model-level attributes
    const attrRegex = /^\s+(@@\w+.*?)$/gm;
    while ((match = attrRegex.exec(body)) !== null) {
      models[name].attributes.push(match[1].trim());
    }
  }

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  const enums = {};

  while ((match = enumRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];

    enums[name] = {
      name,
      values: body.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
    };
  }

  return { models, enums };
}

function generateMarkdown(models, enums) {
  let md = `# Prisma Schema Documentation

Auto-generated from [\`backend/prisma/schema.prisma\`](../../backend/prisma/schema.prisma).

## Models

`;

  // Generate models section
  for (const modelName of Object.keys(models).sort()) {
    const model = models[modelName];

    md += `### \`${modelName}\`\n\n`;

    if (model.fields.length > 0) {
      md += '| Field | Type | Attributes |\n';
      md += '|-------|------|------------|\n';

      for (const field of model.fields) {
        const attrs = field.attributes || '—';
        md += `| \`${field.name}\` | \`${field.type}\` | ${attrs} |\n`;
      }

      md += '\n';
    }

    if (model.attributes.length > 0) {
      md += '**Model attributes:**\n';
      for (const attr of model.attributes) {
        md += `- ${attr}\n`;
      }
      md += '\n';
    }
  }

  // Generate enums section
  if (Object.keys(enums).length > 0) {
    md += '\n## Enums\n\n';

    for (const enumName of Object.keys(enums).sort()) {
      const enumDef = enums[enumName];

      md += `### \`${enumName}\`\n\n`;
      md += '```\n';
      md += enumDef.values.join('\n');
      md += '\n```\n\n';
    }
  }

  md += `---

**Generated:** ${new Date().toISOString()}
`;

  return md;
}

function main() {
  try {
    const { models, enums } = parseSchema();
    const markdown = generateMarkdown(models, enums);

    // Ensure output directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
    console.log(`✅ Generated: ${OUTPUT_FILE}`);
    console.log(`   ${Object.keys(models).length} models, ${Object.keys(enums).length} enums`);
  } catch (error) {
    console.error('❌ Error generating schema docs:', error.message);
    process.exit(1);
  }
}

main();
