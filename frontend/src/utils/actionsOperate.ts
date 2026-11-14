import { shallowRef, nextTick } from 'vue';
import { getActionDefinition } from '@/views/editor/action-catalog/actionCatalog';

export const addItem = (
  form,
  actionsList,
  actionsChecked,
  selectedOptions,
  t
) => {
  const id = crypto.randomUUID();
  const type = selectedOptions[0].value;
  const args = selectedOptions[0].args;
  const enabled = true;
  const previewEnabled = true;
  const customName = selectedOptions[0].customName || "";
  const definition = getActionDefinition(type);
  const obj = {
    id,
    customName,
    type,
    tipsDes: t(`editorPage.subConfig.nodeActions['${type}'].tipsDes`),
    component: definition ? shallowRef(definition.component) : null,
    enabled,
  };

  actionsChecked.push([id, previewEnabled]);
  if (definition) {
    form.process.push({
      id,
      type,
      args: args ?? definition.createArgs(),
      customName,
    });
  }
  actionsList.push(obj);

  // 添加后将页面置底
  // nextTick(() => {
  //   const container = document.querySelector('.app-layout-wrapper');
  //   container.scrollTo({
  //     top: container.scrollHeight,
  //     left: 0,
  //     behavior: 'smooth',
  //   });
  // });
  nextTick(() => {
    const container = document.querySelector('.app-layout-wrapper');
    const distanceToScrollUp = 90; // 向上调整

    const currentScrollTop = container.scrollTop;

    const targetScrollTop = currentScrollTop + distanceToScrollUp;
  
    container.scrollTo({
      top: targetScrollTop,
      left: 0,
      behavior: 'smooth',
    });
  });
  
};


export const deleteItem = (form, actionsList, actionsChecked, id) => {
  const processIndex = form.process.findIndex(item => item.id === id);
  const actionsIndex = actionsList.findIndex(item => item.id === id);
  const checkedIndex = actionsChecked.findIndex(item => item[0] === id);
  form.process.splice(processIndex, 1);
  actionsList.splice(actionsIndex, 1);
  actionsChecked.splice(checkedIndex, 1);
};

export const toggleItem = (actionsList, id) => {
  const index = actionsList.findIndex((item) => item.id === id);
  actionsList[index].enabled = !actionsList[index].enabled;
};
