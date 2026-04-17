import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Inline node rendered as a styled chip in the editor.
 * Serializes to <span data-token="..."></span> in HTML output.
 * Backend fills the span contents at render time.
 */
export const VariableNode = Node.create({
  name: 'variable',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-token'),
        renderHTML: attrs => ({ 'data-token': attrs.token }),
      },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-token]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'email-variable-chip',
      style: 'display:inline-block; padding:2px 8px; border:1px solid #00B8D9; border-radius:4px; color:#00B8D9; font-size:13px; line-height:1.4;',
    }), HTMLAttributes.label || `{{${HTMLAttributes['data-token']}}}`];
  },
});
