import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Atomic block for inline GIFs from GIPHY.
 * Serializes to <img src="..." data-gif="1" alt="GIF" style="max-width:100%; ...">.
 */
export const GifNode = Node.create({
  name: 'gif',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: 'GIF' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-gif="1"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, {
      'data-gif': '1',
      style: 'max-width:100%; height:auto; display:block; margin:12px 0;',
    })];
  },
});
