import React, { useState } from 'react';
import Input, { type InputProps } from './Input';

/**
 * Username / password box for creating or editing SOMEONE ELSE's login (add user, add operator).
 * Browsers otherwise paste the saved login of the person using the app into these boxes.
 * - autocomplete="off" / "new-password" tells the browser this is not a sign-in form;
 * - the box stays read-only until it is focused, because Chrome ignores the hint on page load
 *   but never autofills a read-only field;
 * - a non-login `name` so password managers don't recognise the field.
 */
const NewCredentialInput = React.forwardRef<HTMLInputElement, InputProps & { kind: 'username' | 'password' }>(
  ({ kind, onFocus, readOnly, ...props }, ref) => {
    const [locked, setLocked] = useState(true);
    return (
      <Input
        ref={ref}
        {...props}
        type={kind === 'password' ? (props.type ?? 'password') : 'text'}
        name={kind === 'password' ? 'lcd-new-secret' : 'lcd-new-login'}
        autoComplete={kind === 'password' ? 'new-password' : 'off'}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        readOnly={readOnly || locked}
        onFocus={(e) => { setLocked(false); onFocus?.(e); }}
      />
    );
  }
);
NewCredentialInput.displayName = 'NewCredentialInput';

export default NewCredentialInput;
