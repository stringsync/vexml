import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Alert } from './alert';
import { Button } from './button';
import { FileInput } from './fileinput';
import { TextArea } from './textarea';
import { VexmlContainer } from './vexmlcontainer';
import * as constants from './constants';
import { debounce } from './helpers';
import $ from 'jquery';

// Enable tooltips
$(() => {
  $('[data-toggle="tooltip"]').tooltip();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Components
const fileInput = FileInput.id('fileInput');
const musicxmlTextArea = TextArea.id('musicxmlTextArea');
const saveButton = Button.id('saveButton');
const resetButton = Button.id('resetButton');
const reportButton = Button.id('reportButton');
const alert = Alert.id('alert');
const vexmlContainer = VexmlContainer.id('vexmlContainer');

// State
let musicXml = localStorage.getItem(constants.MUSICXML_LOCAL_STORAGE_KEY) ?? constants.DEFAULT_MUSICXML_DOCUMENT;
let width = vexmlContainer.getWidth();

// Handlers
fileInput.onChange((newText) => {
  musicXml = newText;
  musicxmlTextArea.setText(musicXml);
  render();
});

musicxmlTextArea.setText(musicXml).onChange(
  debounce((newMusicXml) => {
    musicXml = newMusicXml;
    render();
  }, 500)
);

saveButton.onClick(() => {
  localStorage.setItem(constants.MUSICXML_LOCAL_STORAGE_KEY, musicXml);
  render();
});

resetButton.onClick(() => {
  musicXml = constants.DEFAULT_MUSICXML_DOCUMENT;
  localStorage.setItem(constants.MUSICXML_LOCAL_STORAGE_KEY, musicXml);
  musicxmlTextArea.setText(musicXml);
  render();
});

reportButton.onClick(() => {});

// This triggers the initial render.
vexmlContainer.onWidthChange(
  debounce((newWidth) => {
    width = newWidth;
    render();
  }, 100)
);

// Render
function now(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function render() {
  const savedMusicXml = localStorage.getItem(constants.MUSICXML_LOCAL_STORAGE_KEY);

  if (savedMusicXml === musicXml) {
    saveButton.disable();
  } else {
    saveButton.enable();
  }

  if (savedMusicXml === constants.DEFAULT_MUSICXML_DOCUMENT && musicXml === constants.DEFAULT_MUSICXML_DOCUMENT) {
    resetButton.disable();
  } else {
    resetButton.enable();
  }

  try {
    reportButton.disable();
    alert.info().text('Loading...');

    const start = Date.now();
    vexmlContainer.render(musicXml, width);
    const stop = Date.now();
    const ms = stop - start;

    alert.info().text(`${now()} Rendered in ${ms}ms at ${width}px`);
  } catch (e) {
    alert.danger().text(`${now()} ${e instanceof Error && typeof e.stack === 'string' ? e.stack : e}`);
  } finally {
    reportButton.enable();
  }
}
