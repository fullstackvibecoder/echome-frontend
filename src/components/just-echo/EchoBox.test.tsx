import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EchoBox } from './EchoBox';

function Harness({ onSend, disabled = false, initial = '' }: { onSend: (t: string) => void; disabled?: boolean; initial?: string }) {
  const [v, setV] = useState(initial);
  return <EchoBox onSend={onSend} disabled={disabled} placeholder="Ask Echo" value={v} onChange={setV} />;
}

describe('EchoBox', () => {
  it('EchoBox sends on Enter, not on Shift+Enter, and not when disabled', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(<Harness onSend={onSend} />);
    const box = screen.getByPlaceholderText('Ask Echo');
    await user.type(box, 'hello{Shift>}{Enter}{/Shift}there');
    expect(onSend).not.toHaveBeenCalled();
    expect((box as HTMLTextAreaElement).value).toBe('hello\nthere');
    await user.type(box, '{Enter}');
    expect(onSend).toHaveBeenCalledWith('hello\nthere');

    const onSend2 = vi.fn();
    rerender(<Harness onSend={onSend2} disabled initial="x" />);
    const box2 = screen.getByPlaceholderText('Ask Echo');
    await user.type(box2, 'abc{Enter}');
    expect((box2 as HTMLTextAreaElement).value).toContain('abc');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend2).not.toHaveBeenCalled();
  });

  it('EchoBox trims and ignores empty input', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Harness onSend={onSend} initial="   " />);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).not.toHaveBeenCalled();
    const box = screen.getByPlaceholderText('Ask Echo');
    await user.type(box, 'hi  {Enter}');
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('hi');
  });

  it('has only the send button', () => {
    render(<Harness onSend={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
