/**
 * Supercanvas Database - AI Serializer & Parser
 * Enables AI agents to read, summarize, and append structured rows to databases.
 */

import { DatabaseInstance, DatabaseRow, PropertyDefinition } from '../types';
import { formatPropertyValue } from './databaseCalculations';
import { generateRowId } from './databaseDefaults';

function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function serializeDatabaseToMarkdown(db: DatabaseInstance): string {
  const lines: string[] = [];

  // 1. Header & Metadata
  lines.push(`# Database: ${db.title}`);
  if (db.description) {
    lines.push(`> ${db.description}`);
  }
  lines.push('');
  lines.push('### Metadata');
  lines.push(`- **ID**: \`${db.id}\``);
  lines.push(`- **Total Rows**: ${db.rows.length}`);
  lines.push(`- **Total Properties**: ${db.properties.length}`);
  lines.push(`- **Active View**: ${db.views.find((v) => v.id === db.activeViewId)?.name || 'Default'}`);
  lines.push(`- **Last Modified**: ${new Date(db.updatedAt).toISOString()}`);
  lines.push('');

  // 2. Schema Specification
  lines.push('### Schema Definition');
  lines.push('| Property Name | ID | Type | Options / Configuration |');
  lines.push('| :--- | :--- | :--- | :--- |');

  db.properties.forEach((prop) => {
    let details = '-';
    if (prop.options && prop.options.length > 0) {
      details = `Options: [${prop.options.map((o) => `"${o.name}" (id: ${o.id})`).join(', ')}]`;
    } else if (prop.statusOptions && prop.statusOptions.length > 0) {
      details = `Status: [${prop.statusOptions.map((s) => `"${s.name}" (id: ${s.id}, cat: ${s.category})`).join(', ')}]`;
    } else if (prop.numberFormat) {
      details = `Format: ${prop.numberFormat}`;
    } else if (prop.relationTargetVaultPath) {
      details = `Relation Target: ${prop.relationTargetVaultPath}`;
    }
    lines.push(
      `| **${escapeMarkdownCell(prop.name)}** | \`${prop.id}\` | \`${prop.type}\` | ${escapeMarkdownCell(details)} |`
    );
  });
  lines.push('');

  // 3. Views
  lines.push('### Views');
  db.views.forEach((v) => {
    lines.push(
      `- **${v.name}** (\`${v.type}\`)${v.groupByPropertyId ? ` - Grouped by \`${v.groupByPropertyId}\`` : ''}`
    );
  });
  lines.push('');

  // 4. Tabular Data
  lines.push('### Rows Data');
  if (db.rows.length === 0) {
    lines.push('_No rows in this database._');
    lines.push('');
  } else {
    // Header
    const headerCols = db.properties.map((p) => p.name);
    lines.push(`| ${headerCols.map(escapeMarkdownCell).join(' | ')} |`);
    lines.push(`| ${headerCols.map(() => ':---').join(' | ')} |`);

    // Rows
    db.rows.forEach((row) => {
      const rowCols = db.properties.map((prop) => {
        const rawVal = prop.type === 'title' ? row.title : row.properties[prop.id];
        const formatted = formatPropertyValue(rawVal, prop);
        return escapeMarkdownCell(formatted);
      });
      lines.push(`| ${rowCols.join(' | ')} |`);
    });
    lines.push('');
  }

  // 5. Individual Row Notes (if any row has markdown content)
  const rowsWithContent = db.rows.filter((r) => r.content && r.content.trim().length > 0);
  if (rowsWithContent.length > 0) {
    lines.push('### Row Detailed Notes');
    rowsWithContent.forEach((row) => {
      lines.push(`#### ${row.title} (\`${row.id}\`)`);
      lines.push(row.content!.trim());
      lines.push('');
    });
  }

  return lines.join('\n');
}

export function extractDatabaseSummary(db: DatabaseInstance): {
  totalRows: number;
  properties: string[];
  viewCount: number;
  statusCounts: Record<string, number>;
} {
  const totalRows = db.rows.length;
  const properties = db.properties.map((p) => p.name);
  const viewCount = db.views.length;
  const statusCounts: Record<string, number> = {};

  // Find status property
  const statusProp = db.properties.find((p) => p.type === 'status');
  if (statusProp && statusProp.statusOptions) {
    statusProp.statusOptions.forEach((opt) => {
      statusCounts[opt.name] = 0;
    });

    db.rows.forEach((row) => {
      const val = row.properties[statusProp.id];
      const opt = statusProp.statusOptions?.find((o) => o.id === val || o.name === val);
      const label = opt ? opt.name : 'Unknown';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
  }

  return {
    totalRows,
    properties,
    viewCount,
    statusCounts,
  };
}

export function insertRowsFromAI(
  db: DatabaseInstance,
  newRowsData: Partial<DatabaseRow>[]
): DatabaseInstance {
  const now = Date.now();
  const titleProp = db.properties.find((p) => p.type === 'title') || db.properties[0];

  // Build property name to PropertyDefinition map (case-insensitive)
  const propNameMap = new Map<string, PropertyDefinition>();
  const propIdMap = new Map<string, PropertyDefinition>();

  db.properties.forEach((p) => {
    propNameMap.set(p.name.toLowerCase().trim(), p);
    propIdMap.set(p.id, p);
  });

  const createdRows: DatabaseRow[] = newRowsData.map((data) => {
    const rowId = data.id || generateRowId();
    const rowProperties: Record<string, any> = {};

    // Determine row title
    let rowTitle = data.title;
    if (!rowTitle && data.properties) {
      if (titleProp && data.properties[titleProp.id]) {
        rowTitle = String(data.properties[titleProp.id]);
      } else if (titleProp && data.properties[titleProp.name]) {
        rowTitle = String(data.properties[titleProp.name]);
      } else if (data.properties.title || data.properties.name || data.properties.Name) {
        rowTitle = String(data.properties.title || data.properties.name || data.properties.Name);
      }
    }
    rowTitle = rowTitle || 'Untitled';

    // Map properties from incoming data
    if (data.properties) {
      Object.entries(data.properties).forEach(([key, rawValue]) => {
        // Find matching definition by ID or name
        const def = propIdMap.get(key) || propNameMap.get(key.toLowerCase().trim());
        if (!def) return;

        let resolvedValue = rawValue;

        // Resolve select option name to ID
        if (def.type === 'select' && def.options && typeof rawValue === 'string') {
          const match = def.options.find(
            (o) => o.id === rawValue || o.name.toLowerCase() === rawValue.toLowerCase()
          );
          if (match) resolvedValue = match.id;
        }

        // Resolve status option name to ID
        if (def.type === 'status' && def.statusOptions && typeof rawValue === 'string') {
          const match = def.statusOptions.find(
            (s) => s.id === rawValue || s.name.toLowerCase() === rawValue.toLowerCase()
          );
          if (match) resolvedValue = match.id;
        }

        // Resolve multi-select names to IDs
        if (def.type === 'multi-select' && def.options && Array.isArray(rawValue)) {
          resolvedValue = rawValue.map((item) => {
            if (typeof item === 'string') {
              const match = def.options?.find(
                (o) => o.id === item || o.name.toLowerCase() === item.toLowerCase()
              );
              return match ? match.id : item;
            }
            return item;
          });
        }

        rowProperties[def.id] = resolvedValue;
      });
    }

    // Set title in properties
    if (titleProp) {
      rowProperties[titleProp.id] = rowTitle;
    }

    // Fill missing properties with defaults
    db.properties.forEach((prop) => {
      if (rowProperties[prop.id] === undefined) {
        if (prop.type === 'checkbox') {
          rowProperties[prop.id] = false;
        } else if (prop.type === 'multi-select' || prop.type === 'files' || prop.type === 'relation') {
          rowProperties[prop.id] = [];
        } else if (prop.type === 'created_time' || prop.type === 'last_edited_time') {
          rowProperties[prop.id] = now;
        } else {
          rowProperties[prop.id] = null;
        }
      }
    });

    return {
      id: rowId,
      title: rowTitle,
      properties: rowProperties,
      content: data.content || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
      icon: data.icon,
      coverImage: data.coverImage,
    };
  });

  return {
    ...db,
    rows: [...db.rows, ...createdRows],
    updatedAt: now,
  };
}
