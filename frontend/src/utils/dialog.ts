import { reactive } from "vue";

export type DialogOptions = {
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  noCancelBtn?: boolean;
  closeOnClickOverlay?: boolean;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

export const dialogState = reactive<{
  visible: boolean;
  loading: boolean;
  options: DialogOptions;
}>({
  visible: false,
  loading: false,
  options: {},
});

export const showDialog = (options: DialogOptions) => {
  dialogState.options = options;
  dialogState.loading = false;
  dialogState.visible = true;
};

export const closeDialog = () => {
  dialogState.visible = false;
  dialogState.loading = false;
};

export const confirmDialog = async () => {
  const { onOk } = dialogState.options;
  if (onOk) {
    try {
      dialogState.loading = true;
      await onOk();
    } catch (error) {
      // Keep the dialog open so the user can retry; the API layer reports it.
      console.error(error);
      return;
    } finally {
      dialogState.loading = false;
    }
  }
  closeDialog();
};

export const cancelDialog = async () => {
  const { onCancel } = dialogState.options;
  closeDialog();
  if (onCancel) {
    try {
      await onCancel();
    } catch (error) {
      console.error(error);
    }
  }
};

/** Esc / backdrop dismissal: behave like cancel so pending promises settle. */
export const dismissDialog = () => {
  if (dialogState.loading) {
    return;
  }
  void cancelDialog();
};
