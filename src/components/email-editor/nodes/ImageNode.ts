import Image from '@tiptap/extension-image';

/**
 * Extends Tiptap's built-in Image with align + width attributes.
 */
export const ImageNode = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: { default: 'center' },
      width: { default: '100%' },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { align, width, ...rest } = HTMLAttributes;
    const margin = align === 'left' ? '0 auto 0 0' : align === 'right' ? '0 0 0 auto' : '0 auto';
    return ['img', {
      ...rest,
      style: `max-width:${width}; height:auto; display:block; margin:${margin};`,
    }];
  },
});
