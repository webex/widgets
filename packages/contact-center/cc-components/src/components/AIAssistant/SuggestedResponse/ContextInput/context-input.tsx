import React from 'react';
import {Button, Input} from '@momentum-design/components/dist/react';
import {ContextInputProps} from '../../ai-assistant.types';

const ContextInput: React.FC<ContextInputProps> = ({value, disabled, placeholder, onChange, onSubmit}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit();
  };

  return (
    <form className="ai-assistant__context" onSubmit={handleSubmit} data-testid="ai-assistant:context-form">
      <Input
        className="ai-assistant__context-input"
        placeholder={placeholder ?? 'Add context (e.g. customer is asking about refunds)'}
        value={value}
        disabled={disabled}
        aria-label="Add context"
        data-testid="ai-assistant:context-input"
        // @ts-expect-error momentum-design Input emits a CustomEvent
        oninput={(e: CustomEvent<{value: string}> & {target: HTMLInputElement}) =>
          onChange(e.detail?.value ?? e.target?.value ?? '')
        }
      />
      <Button
        type="submit"
        variant="primary"
        size={28}
        disabled={disabled || !value.trim()}
        data-testid="ai-assistant:context-submit"
      >
        Send
      </Button>
    </form>
  );
};

export default ContextInput;
