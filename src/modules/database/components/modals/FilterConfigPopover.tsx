import React from 'react';
import { Plus, Trash2, X, Filter } from 'lucide-react';
import {
  PropertyDefinition,
  FilterGroup,
  FilterRule,
  FilterOperator,
  FilterConjunction,
} from '../../types';
import { generateFilterRuleId } from '../../utils/databaseDefaults';

export interface FilterConfigPopoverProps {
  isOpen: boolean;
  properties: PropertyDefinition[];
  filterGroup: FilterGroup;
  onUpdateFilterGroup: (group: FilterGroup) => void;
  onClose: () => void;
}

const OPERATORS_FOR_TYPE: Record<string, { op: FilterOperator; label: string }[]> = {
  text: [
    { op: 'contains', label: 'contém' },
    { op: 'not_contains', label: 'não contém' },
    { op: 'equals', label: 'é igual a' },
    { op: 'not_equals', label: 'não é igual a' },
    { op: 'is_empty', label: 'está vazio' },
    { op: 'is_not_empty', label: 'não está vazio' },
  ],
  number: [
    { op: 'equals', label: '=' },
    { op: 'not_equals', label: '≠' },
    { op: 'greater_than', label: '>' },
    { op: 'less_than', label: '<' },
    { op: 'is_empty', label: 'está vazio' },
    { op: 'is_not_empty', label: 'não está vazio' },
  ],
  checkbox: [
    { op: 'is_checked', label: 'está marcado' },
    { op: 'is_not_checked', label: 'não está marcado' },
  ],
  date: [
    { op: 'is_today', label: 'é hoje' },
    { op: 'is_before', label: 'é antes de' },
    { op: 'is_after', label: 'é depois de' },
    { op: 'is_empty', label: 'está vazio' },
    { op: 'is_not_empty', label: 'não está vazio' },
  ],
  default: [
    { op: 'equals', label: 'é' },
    { op: 'not_equals', label: 'não é' },
    { op: 'is_empty', label: 'está vazio' },
    { op: 'is_not_empty', label: 'não está vazio' },
  ],
};

export const FilterConfigPopover: React.FC<FilterConfigPopoverProps> = ({
  isOpen,
  properties,
  filterGroup,
  onUpdateFilterGroup,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleConjunctionChange = (conjunction: FilterConjunction) => {
    onUpdateFilterGroup({
      ...filterGroup,
      conjunction,
    });
  };

  const handleAddRule = () => {
    const firstProp = properties[0];
    if (!firstProp) return;

    const newRule: FilterRule = {
      id: generateFilterRuleId(),
      propertyId: firstProp.id,
      operator: firstProp.type === 'checkbox' ? 'is_checked' : 'contains',
      value: '',
    };

    onUpdateFilterGroup({
      ...filterGroup,
      rules: [...filterGroup.rules, newRule],
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    onUpdateFilterGroup({
      ...filterGroup,
      rules: filterGroup.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    onUpdateFilterGroup({
      ...filterGroup,
      rules: filterGroup.rules.filter((r) => r.id !== ruleId),
    });
  };

  const handleClearAll = () => {
    onUpdateFilterGroup({
      ...filterGroup,
      rules: [],
    });
  };

  const getOperatorsForProp = (propId: string) => {
    const prop = properties.find((p) => p.id === propId);
    if (!prop) return OPERATORS_FOR_TYPE.default;
    return OPERATORS_FOR_TYPE[prop.type] || OPERATORS_FOR_TYPE.default;
  };

  const noValueNeeded = (op: FilterOperator) =>
    ['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_today'].includes(op);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#52B1FF]" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-[#F4F0E6]">
              Filtros da Visualização
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules container */}
        <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
          {filterGroup.rules.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-[#B4D3F1] mb-2">
              <span>Onde</span>
              <div className="inline-flex rounded-lg border border-stone-200 dark:border-white/10 p-0.5 bg-stone-50 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => handleConjunctionChange('and')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                    filterGroup.conjunction === 'and'
                      ? 'bg-[#1831D7] text-white shadow-xs'
                      : 'text-stone-500 dark:text-[#B4D3F1]/60'
                  }`}
                >
                  TODAS (E)
                </button>
                <button
                  type="button"
                  onClick={() => handleConjunctionChange('or')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                    filterGroup.conjunction === 'or'
                      ? 'bg-[#1831D7] text-white shadow-xs'
                      : 'text-stone-500 dark:text-[#B4D3F1]/60'
                  }`}
                >
                  QUALQUER (OU)
                </button>
              </div>
              <span>as regras forem atendidas:</span>
            </div>
          )}

          {filterGroup.rules.map((rule) => {
            const ops = getOperatorsForProp(rule.propertyId);
            const hideValue = noValueNeeded(rule.operator);

            return (
              <div
                key={rule.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/5 text-xs"
              >
                {/* Property selector */}
                <select
                  value={rule.propertyId}
                  onChange={(e) => {
                    const newPropId = e.target.value;
                    const prop = properties.find((p) => p.id === newPropId);
                    const newOp = prop?.type === 'checkbox' ? 'is_checked' : 'contains';
                    handleUpdateRule(rule.id, { propertyId: newPropId, operator: newOp });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#232742] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-[#F4F0E6] outline-none max-w-[130px]"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Operator selector */}
                <select
                  value={rule.operator}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, { operator: e.target.value as FilterOperator })
                  }
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-[#232742] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-[#F4F0E6] outline-none"
                >
                  {ops.map((item) => (
                    <option key={item.op} value={item.op}>
                      {item.label}
                    </option>
                  ))}
                </select>

                {/* Value Input */}
                {!hideValue && (
                  <input
                    type="text"
                    value={String(rule.value ?? '')}
                    onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                    placeholder="Valor..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#232742] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-[#F4F0E6] outline-none min-w-[100px]"
                  />
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemoveRule(rule.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  title="Remover filtro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {filterGroup.rules.length === 0 && (
            <div className="py-6 text-center text-xs text-stone-400 dark:text-[#B4D3F1]/50">
              Nenhum filtro ativo nesta visualização.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5">
          <button
            type="button"
            onClick={handleAddRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1831D7] dark:text-[#52B1FF] hover:bg-[#1831D7]/10 dark:hover:bg-[#52B1FF]/10 rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar filtro</span>
          </button>

          {filterGroup.rules.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Limpar todos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
