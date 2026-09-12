import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { TableView } from '@tiptap/extension-table';
import { addColumn, addRow, TableMap } from '@tiptap/pm/tables';
import { TextSelection } from '@tiptap/pm/state';

/**
 * CustomTableView extends TipTap's TableView to provide inline '+' buttons:
 * - A vertical strip with '+' on the right side of the table to append a new column.
 * - A horizontal bar with '+ Linha' at the bottom of the table to append a new row.
 * 
 * Works seamlessly with ProseMirror transactions, preserves undo/redo history,
 * and maintains cursor focus on newly created cells.
 */
export class CustomTableView extends TableView {
  private editorView?: EditorView;
  private addColBtn!: HTMLButtonElement;
  private addRowBtn!: HTMLButtonElement;
  private rowWrapper!: HTMLDivElement;
  private bottomWrapper!: HTMLDivElement;

  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes: Record<string, unknown> = {},
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.editorView = view;

    this.setupDOM();
  }

  private setupDOM() {
    // Configure outer container
    this.dom.className = 'custom-table-wrapper group/table relative my-4 block max-w-full';

    // In super constructor, this.table was appended directly to this.dom.
    // We construct:
    // 1. rowWrapper: flex container holding the table scroll area and the right '+' column button.
    // 2. scrollContainer: horizontal scrolling area holding this.table.
    // 3. addColBtn: vertical '+' column button at the right edge of the table.
    // 4. bottomWrapper: flex container holding the bottom '+' row button and corner spacer.
    // 5. addRowBtn: bottom '+' row button aligned with the table.

    this.rowWrapper = document.createElement('div');
    this.rowWrapper.className = 'custom-table-row-container flex items-stretch w-full max-w-full gap-1';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'custom-table-scroll flex-1 min-w-0 overflow-x-auto custom-scrollbar';
    // Appending this.table moves it from this.dom into scrollContainer
    scrollContainer.appendChild(this.table);
    this.rowWrapper.appendChild(scrollContainer);

    // Create Add Column button (+ ao lado direito da tabela)
    this.addColBtn = document.createElement('button');
    this.addColBtn.type = 'button';
    this.addColBtn.setAttribute('contenteditable', 'false');
    this.addColBtn.setAttribute('tabindex', '-1');
    this.addColBtn.setAttribute('title', 'Adicionar coluna (+)');
    this.addColBtn.setAttribute('aria-label', 'Adicionar coluna à tabela');
    this.addColBtn.className =
      'custom-table-add-col-btn shrink-0 w-6 self-stretch min-h-[36px] flex items-center justify-center rounded-r-md border border-dashed border-[#7F95FF]/30 hover:border-[#1831D7] dark:hover:border-[#7F95FF] bg-[#7F95FF]/5 hover:bg-[#1831D7]/10 dark:hover:bg-[#7F95FF]/15 text-[#7F95FF]/70 hover:text-[#1831D7] dark:hover:text-[#7F95FF] transition-all cursor-pointer opacity-60 hover:opacity-100';
    this.addColBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;

    this.addColBtn.addEventListener('mousedown', this.preventEvent);
    this.addColBtn.addEventListener('click', this.handleAddColumn);
    this.rowWrapper.appendChild(this.addColBtn);

    // Create Add Row container and button (+ no final da tabela)
    this.bottomWrapper = document.createElement('div');
    this.bottomWrapper.className = 'custom-table-bottom-container flex items-center w-full gap-1 mt-1';

    this.addRowBtn = document.createElement('button');
    this.addRowBtn.type = 'button';
    this.addRowBtn.setAttribute('contenteditable', 'false');
    this.addRowBtn.setAttribute('tabindex', '-1');
    this.addRowBtn.setAttribute('title', 'Adicionar linha (+)');
    this.addRowBtn.setAttribute('aria-label', 'Adicionar linha à tabela');
    this.addRowBtn.className =
      'custom-table-add-row-btn flex-1 h-6 sm:h-7 flex items-center justify-center rounded-b-md border border-dashed border-[#7F95FF]/30 hover:border-[#1831D7] dark:hover:border-[#7F95FF] bg-[#7F95FF]/5 hover:bg-[#1831D7]/10 dark:hover:bg-[#7F95FF]/15 text-[#7F95FF]/70 hover:text-[#1831D7] dark:hover:text-[#7F95FF] transition-all cursor-pointer opacity-60 hover:opacity-100';
    this.addRowBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;

    this.addRowBtn.addEventListener('mousedown', this.preventEvent);
    this.addRowBtn.addEventListener('click', this.handleAddRow);
    this.bottomWrapper.appendChild(this.addRowBtn);

    // Spacer to balance the bottom bar with the right '+' column button width
    const cornerSpacer = document.createElement('div');
    cornerSpacer.className = 'w-6 shrink-0 h-7 pointer-events-none';
    cornerSpacer.setAttribute('contenteditable', 'false');
    this.bottomWrapper.appendChild(cornerSpacer);

    // Attach to outer wrapper
    this.dom.appendChild(this.rowWrapper);
    this.dom.appendChild(this.bottomWrapper);

    // Sync initial visibility with editable state
    this.updateControlsVisibility();
  }

  private preventEvent = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  private updateControlsVisibility() {
    const isEditable = this.editorView?.editable ?? true;
    if (this.addColBtn) {
      this.addColBtn.style.display = isEditable ? 'inline-flex' : 'none';
    }
    if (this.bottomWrapper) {
      this.bottomWrapper.style.display = isEditable ? 'flex' : 'none';
    }
  }

  private getTableData(): { table: ProseMirrorNode; tableStart: number; map: TableMap; tablePos: number } | null {
    const view = this.editorView;
    if (!view) return null;

    // 1. Resolve table position via contentDOM (tbody)
    try {
      if (this.contentDOM && this.contentDOM.isConnected) {
        const pos = view.posAtDOM(this.contentDOM, 0);
        const $pos = view.state.doc.resolve(pos);
        for (let d = $pos.depth; d >= 0; d--) {
          const n = $pos.node(d);
          if (n.type.name === 'table') {
            const tableStart = $pos.start(d);
            const tablePos = $pos.before(d);
            const map = TableMap.get(n);
            return { table: n, tableStart, map, tablePos };
          }
        }
      }
    } catch {
      // Continue to fallback
    }

    // 2. Fallback: search doc descendants for this.node
    let foundPos = -1;
    let foundNode: ProseMirrorNode | null = null;
    view.state.doc.descendants((node, pos) => {
      if (node === this.node) {
        foundPos = pos;
        foundNode = node;
        return false;
      }
      return true;
    });

    if (foundNode && foundPos >= 0) {
      const table = foundNode;
      const tableStart = foundPos + 1;
      const map = TableMap.get(table);
      return { table, tableStart, map, tablePos: foundPos };
    }

    return null;
  }

  private handleAddColumn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const view = this.editorView;
    if (!view || !view.editable) return;

    const tableData = this.getTableData();
    if (!tableData) return;

    const { table, tableStart, map } = tableData;
    const rect = {
      table,
      tableStart,
      map,
      left: 0,
      top: 0,
      right: map.width,
      bottom: map.height,
    };
    const tr = addColumn(view.state.tr, rect, map.width);

    // Place selection in the newly appended column's first cell
    try {
      const updatedTable = tr.doc.nodeAt(tableStart - 1);
      if (updatedTable) {
        const updatedMap = TableMap.get(updatedTable);
        const targetCellOffset = updatedMap.map[updatedMap.width - 1];
        if (typeof targetCellOffset === 'number') {
          tr.setSelection(TextSelection.near(tr.doc.resolve(tableStart + targetCellOffset + 1)));
        }
      }
    } catch {
      // Gracefully continue without failing
    }

    view.dispatch(tr);
    view.focus();
  };

  private handleAddRow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const view = this.editorView;
    if (!view || !view.editable) return;

    const tableData = this.getTableData();
    if (!tableData) return;

    const { table, tableStart, map } = tableData;
    const rect = {
      table,
      tableStart,
      map,
      left: 0,
      top: 0,
      right: map.width,
      bottom: map.height,
    };
    const tr = addRow(view.state.tr, rect, map.height);

    // Place selection in the newly appended row's first cell
    try {
      const updatedTable = tr.doc.nodeAt(tableStart - 1);
      if (updatedTable) {
        const updatedMap = TableMap.get(updatedTable);
        const targetCellOffset = updatedMap.map[(updatedMap.height - 1) * updatedMap.width];
        if (typeof targetCellOffset === 'number') {
          tr.setSelection(TextSelection.near(tr.doc.resolve(tableStart + targetCellOffset + 1)));
        }
      }
    } catch {
      // Gracefully continue without failing
    }

    view.dispatch(tr);
    view.focus();
  };

  override update(node: ProseMirrorNode) {
    const result = super.update(node);
    if (!result) return false;

    this.updateControlsVisibility();
    return true;
  }

  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (this.addColBtn?.contains(target) ||
        this.addRowBtn?.contains(target) ||
        this.bottomWrapper?.contains(target))
    ) {
      return true;
    }
    return false;
  }

  destroy() {
    if (this.addColBtn) {
      this.addColBtn.removeEventListener('click', this.handleAddColumn);
      this.addColBtn.removeEventListener('mousedown', this.preventEvent);
    }
    if (this.addRowBtn) {
      this.addRowBtn.removeEventListener('click', this.handleAddRow);
      this.addRowBtn.removeEventListener('mousedown', this.preventEvent);
    }
  }
}
