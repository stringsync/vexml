import { FileInput } from './fileinput';
import { $ } from './helpers';
import { TextArea } from './textarea';

// Components
const fileInput = FileInput.id('file-input');
const musicxmlTextArea = TextArea.id('musicxml-text-area');
const saveCheckbox = $('save-checkbox', HTMLInputElement);
const loadingButton = $('loading-button', HTMLButtonElement);
const reportButton = $('report-button', HTMLButtonElement);
const alert = $('alert', HTMLDivElement);
const result = $('result', HTMLDivElement);

// Handlers
fileInput.onChange((text) => {
  console.log(text);
});

musicxmlTextArea.onChange((text) => {
  console.log(text);
});
