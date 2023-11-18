import { Alert } from './alert';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { FileInput } from './fileinput';
import { TextArea } from './textarea';
import { VexmlContainer } from './vexmlcontainer';

// Components
const fileInput = FileInput.id('file-input');
const musicxmlTextArea = TextArea.id('musicxml-text-area');
const saveCheckbox = Checkbox.id('save-checkbox');
const loadingButton = Button.id('loading-button');
const reportButton = Button.id('report-button');
const alert = Alert.id('alert');
const vexmlContainer = VexmlContainer.id('vexml-container');

// Handlers
fileInput.onChange((text) => {
  console.log(text);
});

musicxmlTextArea.onChange((text) => {
  console.log(text);
});

saveCheckbox.onChange((isChecked) => {
  console.log(isChecked);
});

loadingButton.onClick(() => {
  console.log('loading clicked');
});

reportButton.onClick(() => {
  alert.danger().text('test123').show();
});
