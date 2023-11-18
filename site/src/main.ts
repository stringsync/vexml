import { Alert } from './alert';
import { Button } from './button';
import { FileInput } from './fileinput';
import { TextArea } from './textarea';
import { VexmlContainer } from './vexmlcontainer';

// Initialize tooltips for the whole document
declare const $: any;

$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

// Components
const fileInput = FileInput.id('fileInput');
const musicxmlTextArea = TextArea.id('musicxmlTextArea');
const saveButton = Button.id('saveButton');
const resetButton = Button.id('resetButton');
const loadingButton = Button.id('loadingButton');
const reportButton = Button.id('reportButton');
const alert = Alert.id('alert');
const vexmlContainer = VexmlContainer.id('vexmlContainer');

// Handlers
fileInput.onChange((text) => {
  console.log(text);
});

musicxmlTextArea.onChange((text) => {
  console.log(text);
});

saveButton.onClick(() => {
  console.log('saved');
});

resetButton.onClick(() => {
  console.log('reset');
});

loadingButton.onClick(() => {
  console.log('loading clicked');
});

reportButton.onClick(() => {
  alert.danger().text('test123').show();
});
