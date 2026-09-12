/**
 * Supercanvas Database - Defaults and Starter Templates
 * Built with full Supercanvas Design System aesthetics.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PropertyType,
  PropertyDefinition,
  SelectOption,
  StatusOption,
  DatabaseRow,
  DatabaseViewConfig,
  DatabaseViewType,
  DatabaseInstance,
  DatabaseTemplate,
} from '../types';

export function generateDatabaseId(): string {
  return `db_${uuidv4()}`;
}

export function generateRowId(): string {
  return `row_${uuidv4()}`;
}

export function generatePropertyId(): string {
  return `prop_${uuidv4()}`;
}

export function generateViewId(): string {
  return `view_${uuidv4()}`;
}

export function generateOptionId(): string {
  return `opt_${uuidv4()}`;
}

export function generateFilterRuleId(): string {
  return `flt_${uuidv4()}`;
}

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { id: 'status_todo', name: 'To Do', color: 'gray', category: 'to_do' },
  { id: 'status_in_progress', name: 'In Progress', color: 'blue', category: 'in_progress' },
  { id: 'status_done', name: 'Done', color: 'green', category: 'done' },
];

export const DEFAULT_TASK_STATUS_OPTIONS: StatusOption[] = [
  { id: 'task_todo', name: 'To Do', color: 'gray', category: 'to_do' },
  { id: 'task_in_progress', name: 'In Progress', color: 'blue', category: 'in_progress' },
  { id: 'task_review', name: 'In Review', color: 'purple', category: 'in_progress' },
  { id: 'task_done', name: 'Completed', color: 'green', category: 'done' },
];

export const DEFAULT_PRIORITY_OPTIONS: SelectOption[] = [
  { id: 'prio_low', name: 'Low', color: 'cyan' },
  { id: 'prio_medium', name: 'Medium', color: 'blue' },
  { id: 'prio_high', name: 'High', color: 'amber' },
  { id: 'prio_urgent', name: 'Urgent', color: 'rose' },
];

export function createDefaultProperty(type: PropertyType, name?: string): PropertyDefinition {
  const id = generatePropertyId();
  let defaultWidth = 180;
  let options: SelectOption[] | undefined;
  let statusOptions: StatusOption[] | undefined;
  let resolvedName = name;

  switch (type) {
    case 'title':
      resolvedName = resolvedName || 'Name';
      defaultWidth = 260;
      break;
    case 'text':
      resolvedName = resolvedName || 'Text';
      defaultWidth = 200;
      break;
    case 'number':
      resolvedName = resolvedName || 'Number';
      defaultWidth = 130;
      break;
    case 'select':
      resolvedName = resolvedName || 'Select';
      defaultWidth = 160;
      options = [
        { id: generateOptionId(), name: 'Option 1', color: 'blue' },
        { id: generateOptionId(), name: 'Option 2', color: 'green' },
        { id: generateOptionId(), name: 'Option 3', color: 'amber' },
      ];
      break;
    case 'multi-select':
      resolvedName = resolvedName || 'Tags';
      defaultWidth = 200;
      options = [
        { id: generateOptionId(), name: 'Tag 1', color: 'cyan' },
        { id: generateOptionId(), name: 'Tag 2', color: 'purple' },
        { id: generateOptionId(), name: 'Tag 3', color: 'rose' },
      ];
      break;
    case 'status':
      resolvedName = resolvedName || 'Status';
      defaultWidth = 150;
      statusOptions = [
        { id: generateOptionId(), name: 'To Do', color: 'gray', category: 'to_do' },
        { id: generateOptionId(), name: 'In Progress', color: 'blue', category: 'in_progress' },
        { id: generateOptionId(), name: 'Done', color: 'green', category: 'done' },
      ];
      break;
    case 'date':
      resolvedName = resolvedName || 'Date';
      defaultWidth = 150;
      break;
    case 'checkbox':
      resolvedName = resolvedName || 'Done';
      defaultWidth = 90;
      break;
    case 'url':
      resolvedName = resolvedName || 'URL';
      defaultWidth = 190;
      break;
    case 'email':
      resolvedName = resolvedName || 'Email';
      defaultWidth = 190;
      break;
    case 'phone':
      resolvedName = resolvedName || 'Phone';
      defaultWidth = 150;
      break;
    case 'files':
      resolvedName = resolvedName || 'Files & Media';
      defaultWidth = 180;
      break;
    case 'relation':
      resolvedName = resolvedName || 'Related Item';
      defaultWidth = 190;
      break;
    case 'created_time':
      resolvedName = resolvedName || 'Created Time';
      defaultWidth = 160;
      break;
    case 'last_edited_time':
      resolvedName = resolvedName || 'Last Edited';
      defaultWidth = 160;
      break;
  }

  return {
    id,
    name: resolvedName,
    type,
    width: defaultWidth,
    options,
    statusOptions,
    numberFormat: type === 'number' ? 'number' : undefined,
  };
}

export function createDefaultView(
  type: DatabaseViewType,
  name?: string,
  properties: PropertyDefinition[] = []
): DatabaseViewConfig {
  const id = generateViewId();
  const defaultName =
    name ||
    (type === 'table'
      ? 'Table'
      : type === 'board'
      ? 'Board'
      : type === 'gallery'
      ? 'Gallery'
      : 'List');

  const visiblePropertyIds = properties.map((p) => p.id);
  const columnWidths: Record<string, number> = {};
  properties.forEach((p) => {
    if (p.width) {
      columnWidths[p.id] = p.width;
    }
  });

  // If view is board, look for status or select property to group by
  let groupByPropertyId: string | undefined;
  if (type === 'board') {
    const statusProp = properties.find((p) => p.type === 'status');
    const selectProp = properties.find((p) => p.type === 'select');
    groupByPropertyId = statusProp?.id || selectProp?.id;
  }

  return {
    id,
    name: defaultName,
    type,
    sorts: [],
    filterGroup: {
      conjunction: 'and',
      rules: [],
    },
    groupByPropertyId,
    visiblePropertyIds,
    columnWidths,
    cardSize: 'medium',
    fitImage: false,
    rowHeight: 'normal',
    showRowNumbers: false,
  };
}

export function createDefaultRow(
  properties: PropertyDefinition[],
  initialTitle: string = 'Untitled'
): DatabaseRow {
  const rowId = generateRowId();
  const now = Date.now();
  const rowProperties: Record<string, any> = {};

  properties.forEach((prop) => {
    if (prop.type === 'title') {
      rowProperties[prop.id] = initialTitle;
    } else if (prop.type === 'status') {
      rowProperties[prop.id] = prop.statusOptions?.[0]?.id || 'status_todo';
    } else if (prop.type === 'checkbox') {
      rowProperties[prop.id] = false;
    } else if (prop.type === 'multi-select') {
      rowProperties[prop.id] = [];
    } else if (prop.type === 'files') {
      rowProperties[prop.id] = [];
    } else if (prop.type === 'relation') {
      rowProperties[prop.id] = [];
    } else if (prop.type === 'created_time') {
      rowProperties[prop.id] = now;
    } else if (prop.type === 'last_edited_time') {
      rowProperties[prop.id] = now;
    } else {
      rowProperties[prop.id] = null;
    }
  });

  return {
    id: rowId,
    title: initialTitle,
    properties: rowProperties,
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultDatabase(title: string = 'Nova Base de Dados'): DatabaseInstance {
  const dbId = generateDatabaseId();
  const now = Date.now();

  const titleProp: PropertyDefinition = {
    id: 'prop_title',
    name: 'Nome',
    type: 'title',
    width: 260,
  };

  const properties: PropertyDefinition[] = [titleProp];
  const tableView = createDefaultView('table', 'Tabela', properties);

  return {
    id: dbId,
    title,
    description: '',
    icon: '',
    properties,
    rows: [],
    views: [tableView],
    activeViewId: tableView.id,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function createTaskDatabase(): DatabaseInstance {
  const dbId = generateDatabaseId();
  const now = Date.now();

  const titleProp: PropertyDefinition = {
    id: 'prop_task_title',
    name: 'Task',
    type: 'title',
    width: 280,
  };

  const statusProp: PropertyDefinition = {
    id: 'prop_task_status',
    name: 'Status',
    type: 'status',
    width: 150,
    statusOptions: DEFAULT_TASK_STATUS_OPTIONS,
  };

  const priorityProp: PropertyDefinition = {
    id: 'prop_task_priority',
    name: 'Priority',
    type: 'select',
    width: 140,
    options: DEFAULT_PRIORITY_OPTIONS,
  };

  const assigneeProp: PropertyDefinition = {
    id: 'prop_task_assignee',
    name: 'Assignee',
    type: 'text',
    width: 160,
  };

  const dueDateProp: PropertyDefinition = {
    id: 'prop_task_due',
    name: 'Due Date',
    type: 'date',
    width: 140,
  };

  const estimateProp: PropertyDefinition = {
    id: 'prop_task_estimate',
    name: 'Est. Hours',
    type: 'number',
    width: 120,
    numberFormat: 'number',
  };

  const doneProp: PropertyDefinition = {
    id: 'prop_task_done',
    name: 'Done',
    type: 'checkbox',
    width: 80,
  };

  const properties: PropertyDefinition[] = [
    titleProp,
    statusProp,
    priorityProp,
    assigneeProp,
    dueDateProp,
    estimateProp,
    doneProp,
  ];

  const boardView = createDefaultView('board', 'Task Board', properties);
  boardView.groupByPropertyId = statusProp.id;

  const tableView = createDefaultView('table', 'All Tasks', properties);

  const urgentView = createDefaultView('table', 'High Priority', properties);
  urgentView.filterGroup = {
    conjunction: 'or',
    rules: [
      {
        id: generateFilterRuleId(),
        propertyId: priorityProp.id,
        operator: 'equals',
        value: 'prio_high',
      },
      {
        id: generateFilterRuleId(),
        propertyId: priorityProp.id,
        operator: 'equals',
        value: 'prio_urgent',
      },
    ],
  };

  const rows: DatabaseRow[] = [
    {
      id: generateRowId(),
      title: 'Draft campaign scenario outline',
      properties: {
        prop_task_title: 'Draft campaign scenario outline',
        prop_task_status: 'task_in_progress',
        prop_task_priority: 'prio_high',
        prop_task_assignee: 'Dungeon Master',
        prop_task_due: new Date(now + 86400000 * 2).toISOString().split('T')[0],
        prop_task_estimate: 4,
        prop_task_done: false,
      },
      content: 'Outline the main villain motives and three key encounter locations.',
      createdAt: now,
      updatedAt: now,
      icon: '📜',
    },
    {
      id: generateRowId(),
      title: 'Configure atmospheric audio soundscapes',
      properties: {
        prop_task_title: 'Configure atmospheric audio soundscapes',
        prop_task_status: 'task_todo',
        prop_task_priority: 'prio_medium',
        prop_task_assignee: 'Sound Designer',
        prop_task_due: new Date(now + 86400000 * 4).toISOString().split('T')[0],
        prop_task_estimate: 2,
        prop_task_done: false,
      },
      content: 'Add tavern murmur and rain ambient stems to the board.',
      createdAt: now,
      updatedAt: now,
      icon: '🎵',
    },
    {
      id: generateRowId(),
      title: 'Review monster stats and spells',
      properties: {
        prop_task_title: 'Review monster stats and spells',
        prop_task_status: 'task_done',
        prop_task_priority: 'prio_urgent',
        prop_task_assignee: 'Dungeon Master',
        prop_task_due: new Date(now - 86400000).toISOString().split('T')[0],
        prop_task_estimate: 3,
        prop_task_done: true,
      },
      content: 'Verified legendary actions and spell slots for the final encounter.',
      createdAt: now,
      updatedAt: now,
      icon: '⚔️',
    },
  ];

  return {
    id: dbId,
    title: 'Tasks & Sprints',
    description: 'Track project milestones, tasks, priorities, and assignments.',
    icon: '✅',
    properties,
    rows,
    views: [boardView, tableView, urgentView],
    activeViewId: boardView.id,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function createInventoryDatabase(): DatabaseInstance {
  const dbId = generateDatabaseId();
  const now = Date.now();

  const nameProp: PropertyDefinition = {
    id: 'prop_inv_name',
    name: 'Item Name',
    type: 'title',
    width: 260,
  };

  const typeProp: PropertyDefinition = {
    id: 'prop_inv_type',
    name: 'Item Type',
    type: 'select',
    width: 150,
    options: [
      { id: 'type_weapon', name: 'Weapon', color: 'rose' },
      { id: 'type_armor', name: 'Armor', color: 'blue' },
      { id: 'type_potion', name: 'Potion', color: 'green' },
      { id: 'type_artifact', name: 'Artifact', color: 'purple' },
      { id: 'type_scroll', name: 'Scroll', color: 'amber' },
      { id: 'type_misc', name: 'Misc', color: 'gray' },
    ],
  };

  const rarityProp: PropertyDefinition = {
    id: 'prop_inv_rarity',
    name: 'Rarity',
    type: 'select',
    width: 140,
    options: [
      { id: 'rarity_common', name: 'Common', color: 'gray' },
      { id: 'rarity_uncommon', name: 'Uncommon', color: 'green' },
      { id: 'rarity_rare', name: 'Rare', color: 'blue' },
      { id: 'rarity_very_rare', name: 'Very Rare', color: 'purple' },
      { id: 'rarity_legendary', name: 'Legendary', color: 'amber' },
    ],
  };

  const weightProp: PropertyDefinition = {
    id: 'prop_inv_weight',
    name: 'Weight (lbs)',
    type: 'number',
    width: 120,
    numberFormat: 'number',
  };

  const valueProp: PropertyDefinition = {
    id: 'prop_inv_value',
    name: 'Value (GP)',
    type: 'number',
    width: 130,
    numberFormat: 'number',
  };

  const qtyProp: PropertyDefinition = {
    id: 'prop_inv_qty',
    name: 'Quantity',
    type: 'number',
    width: 100,
    numberFormat: 'number',
  };

  const attunementProp: PropertyDefinition = {
    id: 'prop_inv_attunement',
    name: 'Requires Attunement',
    type: 'checkbox',
    width: 150,
  };

  const loreProp: PropertyDefinition = {
    id: 'prop_inv_lore',
    name: 'Lore & Effect',
    type: 'text',
    width: 280,
  };

  const properties: PropertyDefinition[] = [
    nameProp,
    typeProp,
    rarityProp,
    weightProp,
    valueProp,
    qtyProp,
    attunementProp,
    loreProp,
  ];

  const tableView = createDefaultView('table', 'Item Catalog', properties);
  const rarityBoard = createDefaultView('board', 'By Rarity', properties);
  rarityBoard.groupByPropertyId = rarityProp.id;

  const galleryView = createDefaultView('gallery', 'Magic Items Gallery', properties);

  const rows: DatabaseRow[] = [
    {
      id: generateRowId(),
      title: 'Moonblade of the High Forest',
      properties: {
        prop_inv_name: 'Moonblade of the High Forest',
        prop_inv_type: 'type_weapon',
        prop_inv_rarity: 'rarity_legendary',
        prop_inv_weight: 3,
        prop_inv_value: 50000,
        prop_inv_qty: 1,
        prop_inv_attunement: true,
        prop_inv_lore: 'A sentient elven longsword that glows with pale silver light in the presence of fiends.',
      },
      content: '+3 bonus to attack and damage rolls. Emits moonlight in a 30ft radius.',
      createdAt: now,
      updatedAt: now,
      icon: '🗡️',
    },
    {
      id: generateRowId(),
      title: 'Potion of Superior Healing',
      properties: {
        prop_inv_name: 'Potion of Superior Healing',
        prop_inv_type: 'type_potion',
        prop_inv_rarity: 'rarity_rare',
        prop_inv_weight: 0.5,
        prop_inv_value: 500,
        prop_inv_qty: 4,
        prop_inv_attunement: false,
        prop_inv_lore: 'A deep crimson liquid that glimmers faintly. Restores 8d4 + 8 hit points.',
      },
      content: 'Standard draught brewed by master herbalists of Neverwinter.',
      createdAt: now,
      updatedAt: now,
      icon: '🧪',
    },
    {
      id: generateRowId(),
      title: 'Cloak of Elvenkind',
      properties: {
        prop_inv_name: 'Cloak of Elvenkind',
        prop_inv_type: 'type_armor',
        prop_inv_rarity: 'rarity_uncommon',
        prop_inv_weight: 1,
        prop_inv_value: 350,
        prop_inv_qty: 1,
        prop_inv_attunement: true,
        prop_inv_lore: 'Shifts hue to match surroundings, granting advantage on Dexterity (Stealth) checks.',
      },
      content: 'Woven from spider silk and autumn leaves.',
      createdAt: now,
      updatedAt: now,
      icon: '🧥',
    },
  ];

  return {
    id: dbId,
    title: 'RPG Inventory & Lore',
    description: 'Catalog magical items, weapons, loot, and campaign relics.',
    icon: '🎒',
    properties,
    rows,
    views: [tableView, rarityBoard, galleryView],
    activeViewId: tableView.id,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export const DATABASE_TEMPLATES: DatabaseTemplate[] = [
  {
    id: 'tpl_default',
    name: 'General Tracker',
    description: 'Versatile database with Title, Status, Tags, and Due Dates.',
    icon: '🗂️',
    template: () => createDefaultDatabase('General Tracker'),
  },
  {
    id: 'tpl_tasks',
    name: 'Task Board & Sprints',
    description: 'Track assignments, priorities, estimates, and Kanban workflow.',
    icon: '✅',
    template: () => createTaskDatabase(),
  },
  {
    id: 'tpl_inventory',
    name: 'RPG Inventory & Lore',
    description: 'Track campaign items, rarity, weight, gold value, and attunement.',
    icon: '🎒',
    template: () => createInventoryDatabase(),
  },
];
