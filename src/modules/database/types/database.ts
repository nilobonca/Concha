/**
 * Supercanvas Database - Database Instance & Row Types
 */

import { PropertyDefinition } from './properties';
import { DatabaseViewConfig } from './views';

export interface DatabaseRow {
  id: string;
  title: string;
  properties: Record<string, any>;
  content?: string;
  createdAt: number;
  updatedAt: number;
  icon?: string;
  coverImage?: string;
}

export interface DatabaseInstance {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  properties: PropertyDefinition[];
  rows: DatabaseRow[];
  views: DatabaseViewConfig[];
  activeViewId: string;
  createdAt: number;
  updatedAt: number;
  version?: number;
}

export interface DatabaseTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  template: () => DatabaseInstance;
}
