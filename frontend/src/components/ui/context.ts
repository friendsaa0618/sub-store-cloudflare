export type CheckboxGroupContext = {
  value: (string | number)[];
  toggle: (value: string | number) => void;
  isDisabled: boolean;
};

export type RadioGroupContext = {
  value: string | number | undefined;
  select: (value: string | number) => void;
  isDisabled: boolean;
};

export const CHECKBOX_GROUP_KEY = Symbol("app-checkbox-group");
export const RADIO_GROUP_KEY = Symbol("app-radio-group");
export const FORM_KEY = Symbol("app-form");
