<template>
  <EditorGroup
    :title="$t(`editorPage.subConfig.groups.source`)"
    :show-title="showGroupTitles"
  >
    <!-- source -->
    <AppFormItem
      required
      :label="$t(`editorPage.subConfig.basic.source.label`)"
      prop="source"
    >
      <div class="radio-wrapper">
        <AppRadioGroup direction="horizontal" v-model="form.source">
          <AppRadio shape="button" label="remote">
            {{ $t(`editorPage.subConfig.basic.source.remote`) }}
          </AppRadio>
          <AppRadio shape="button" label="local">
            {{ $t(`editorPage.subConfig.basic.source.local`) }}
          </AppRadio>
        </AppRadioGroup>
      </div>
    </AppFormItem>
    <!-- url / content -->
    <!-- :label="$t(`editorPage.subConfig.basic.url.label`)" -->
    <AppFormItem
      required

      v-if="form.source === 'remote'"
      prop="url"
      :rules="[
        {
          required: true,
          message: $t(`editorPage.subConfig.basic.url.isEmpty`),
        },
        {
          validator: urlValidator,
          message: $t(`editorPage.subConfig.basic.url.isIllegal`),
        },
      ]"
    >
      <template v-slot:label>
        <EditorFieldLabel @tip="urlTips">
          <span>{{ $t(`editorPage.subConfig.basic.url.label`) }}</span>
        </EditorFieldLabel>
      </template>
      <AppTextarea
        class="textarea-wrapper"
        @blur="validateField('url')"
        @change="strTrim('url')"
        v-model="form.url"
        :autosize="{ maxHeight: 110, minHeight: 50 }"
        :placeholder="$t(`editorPage.subConfig.basic.url.placeholder`)"
        />
    </AppFormItem>
    <LocalContentEditor
      v-else-if="form.source === 'local'"
      @fullscreen="emit('fullscreen')"
    />
    <!-- ua -->
    <AppFormItem
      :label="$t(`editorPage.subConfig.basic.passThroughUA.label`)"
      prop="passThroughUA"
      class="ignore-failed-wrapper"
      v-if="form.source === 'remote'"
    >
      <div class="switch-wrapper">
        <AppSwitch
          v-model="form.passThroughUA"
          :aria-label="$t(`editorPage.subConfig.basic.passThroughUA.label`)"
          @change="handlePassThroughUAChange"
        />
      </div>
    </AppFormItem>
    <AppFormItem
      prop="ua"
      v-if="form.source === 'remote'"
    >
      <template v-slot:label>
        <EditorFieldLabel @tip="uaTips">
          <span>{{ $t(`editorPage.subConfig.basic.ua.label`) }}</span>
        </EditorFieldLabel>
      </template>
      <AppInput
        v-model.trim="form.ua"
        :placeholder="userAgentPlaceholder"
        :readonly="passThroughUAOn"
      />
    </AppFormItem>

    <SubUserinfoField />
  </EditorGroup>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";

import EditorFieldLabel from "@/views/editor/components/EditorFieldLabel.vue";
import EditorGroup from "@/views/editor/components/EditorGroup.vue";
import LocalContentEditor from "@/views/editor/components/LocalContentEditor.vue";
import SubUserinfoField from "@/views/editor/components/SubUserinfoField.vue";
import { showDialog } from "@/utils/dialog";

defineProps<{
  showGroupTitles: boolean;
  validateField: (prop: string) => void;
}>();

const emit = defineEmits<{
  (e: "fullscreen"): void;
}>();

const { t } = useI18n();
const form = inject<Record<string, any>>("form")!;

const passThroughUAOn = computed(() => {
  return form.source === "remote" && form.passThroughUA;
});

const userAgentPlaceholder = computed(() => {
  return passThroughUAOn.value
    ? t(`editorPage.subConfig.basic.ua.placeholderDisabled`)
    : t(`editorPage.subConfig.basic.ua.placeholder`);
});

const handlePassThroughUAChange = (val: boolean) => {
  if (val) {
    form._savedUA = form.ua;
    form.ua = "";
  } else {
    if (form._savedUA !== undefined) {
      form.ua = form._savedUA;
      form._savedUA = undefined;
    }
  }
};

// url 格式验证器
const urlValidator = (val: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (/\n/.test(val)) {
      resolve(
        val
          .split(/[\r\n]+/)
          .map((i) => i.trim())
          .filter((i) => i.length)
          .every((i) => /^(http|https):\/\/\S+$/.test(i))
      );
    } else {
      resolve(/^(http|https):\/\/\S+$/.test(val));
    }
  });
};

// 去除空格
const strTrim = (prop: string) => {
  if (typeof form[prop] === "string") {
    form[prop] = form[prop].trim();
  }
};

const uaTips = () => {
  showDialog({
    title: t("editorPage.subConfig.basic.ua.tips.title"),
    content: t("editorPage.subConfig.basic.ua.tips.content"),
    okText: 'OK',
    noCancelBtn: true,
  });
};
const urlTips = () => {
  showDialog({
    title: t('editorPage.subConfig.basic.url.tips.title'),
    content: t('editorPage.subConfig.basic.url.tips.content'),
    okText: 'OK',
    noCancelBtn: true,
  });
};
</script>

<style scoped>
.radio-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;

  &:deep(.app-radio.is-button) {
    padding: 5px 10px;
  }
}

.ignore-failed-wrapper {
  flex-direction: row;
  justify-content: space-between;
  &:deep(.app-form-item__label) {
    width: auto;
  }
  & .switch-wrapper {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
