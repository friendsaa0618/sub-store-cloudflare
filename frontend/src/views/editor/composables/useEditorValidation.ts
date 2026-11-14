import { nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";

import { showDialog } from "@/utils/dialog";

type ValidationError = { prop?: string; message?: string };

/**
 * Form-level validation for the editor: owns the AppForm ref, reveals the
 * first invalid field, and keeps the error dialog's "fix it" action on it.
 */
export const useEditorValidation = () => {
  const { t } = useI18n();
  const ruleForm = ref<any>(null);

  /**
   * There are no section tabs any more, but the form is long enough that the
   * offending field is usually off-screen: bring it into view and focus it so
   * "去修改" lands on something.
   */
  const revealField = (prop: string) => {
    const item = document.querySelector<HTMLElement>(`.app-form-item[data-prop="${prop}"]`);
    if (!item) return;
    item.scrollIntoView({ block: "center", behavior: "smooth" });
    item.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
  };

  let pendingValidationProp: string | null = null;

  const focusValidationErrorTab = (errors?: ValidationError[] | ValidationError) => {
    const prop = Array.isArray(errors) ? errors[0]?.prop : errors?.prop;
    if (!prop) return;
    pendingValidationProp = prop;
    nextTick(() => revealField(prop));
  };

  /** The dialog takes focus, so land on the field once it closes. */
  const focusPendingValidationField = () => {
    const prop = pendingValidationProp;
    pendingValidationProp = null;
    if (prop) nextTick(() => revealField(prop));
  };

  /** Validate the whole form; on failure point at the first offending field. */
  const validateForm = async () => {
    const { valid, errors } = await ruleForm.value.validate();
    if (valid) return true;

    focusValidationErrorTab(errors);
    showDialog({
      title: t(`editorPage.subConfig.pop.errorTitle`),
      content: errors[0].message,
      noCancelBtn: true,
      okText: t(`editorPage.subConfig.pop.errorBtn`),
      closeOnClickOverlay: true,
      onOk: focusPendingValidationField,
    });
    return false;
  };

  /** Blur validation for a single field. */
  const validateField = (prop: string) => {
    ruleForm.value.validate(prop);
  };

  return { ruleForm, validateForm, validateField, focusValidationErrorTab };
};
