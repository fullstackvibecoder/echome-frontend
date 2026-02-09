'use client';

/**
 * Template Picker Component
 *
 * Grid of templates for selection.
 */

import type { ReelTemplate } from '@/types';
import { TemplateCard } from './TemplateCard';

interface TemplatePickerProps {
  templates: ReelTemplate[];
  selectedId?: string;
  onSelect: (template: ReelTemplate) => void;
}

export function TemplatePicker({ templates, selectedId, onSelect }: TemplatePickerProps) {
  // Group templates by category
  const categories = ['hook', 'transformation', 'tutorial', 'lifestyle', 'trending'] as const;
  const categoryLabels: Record<string, string> = {
    hook: 'Quick Hooks',
    transformation: 'Transformations',
    tutorial: 'Tutorials',
    lifestyle: 'Lifestyle',
    trending: 'Trending Formats',
  };

  const groupedTemplates = categories.reduce((acc, category) => {
    const filtered = templates.filter(t => t.category === category);
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, ReelTemplate[]>);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">Choose a Template</h2>
        <p className="text-text-secondary text-sm">
          Select a template to get started. Each template has predefined segments and transitions.
        </p>
      </div>

      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            {categoryLabels[category]}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onClick={() => onSelect(template)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
