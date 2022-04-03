import * as vexml from '../../src';

const render = async (example: string): Promise<void> => {
  const title = document.createElement('h2');
  title.innerHTML = example;
  title.setAttribute('id', example);

  const status = document.createElement('small');
  status.innerHTML = 'loading';

  const content = document.createElement('div');
  content.setAttribute('id', `content-${example}`);

  const separator = document.createElement('hr');

  document.body.appendChild(title);
  document.body.appendChild(status);
  document.body.appendChild(content);
  document.body.appendChild(separator);

  const res = await fetch(`examples/${example}`);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  try {
    content.innerHTML = '';
    status.innerHTML = 'rendering';
    vexml.EasyScoreMessageRenderer.render(content.id, xml);
    status.innerHTML = '';
  } catch (e) {
    const pre = document.createElement('pre');
    pre.innerHTML = e instanceof Error ? e.stack || e.message : `something went wrong: ${e}`;
    content.innerHTML = '';
    content.appendChild(pre);
  }
};

window.addEventListener('load', async () => {
  const res = await fetch('manifest.json');
  const manifest = await res.json();
  manifest.examples.forEach(render);
});
