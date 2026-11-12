import fs from 'node:fs';
import vm from 'node:vm';
import { TextEncoder } from 'node:util';

const fields = Object.fromEntries(['docente', 'email', 'curso', 'biblioteca', 'quantidade'].map(name => [name, { value: '', addEventListener() {} }]));
const form = { elements: fields, addEventListener() {}, reportValidity() { return true; } };
const context = {
  TextEncoder,
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  console,
  window: { SIBI_BACKGROUND: 'data:image/jpeg;base64,' },
  document: {
    querySelector(selector) {
      if (selector === '#sibi-form') return form;
      if (selector === '#status') return { textContent: '' };
      if (selector === '#generate') return { disabled: false };
      if (selector === '#form-background') return { src: '' };
      if (selector.startsWith('[data-preview=')) return { textContent: '' };
      return null;
    }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);

const jpeg = fs.readFileSync(new URL('../assets/formulario-base.jpg', import.meta.url));
const pdf = context.makePdf(jpeg, {
  docente: 'Profa. Maria da Silva',
  email: 'maria.silva@ufpr.br',
  curso: 'Engenharia de Produção',
  biblioteca: 'Biblioteca de Ciência e Tecnologia',
  quantidade: '25'
});
const target = new URL('../../tmp/pdfs/js-generated.pdf', import.meta.url);
fs.mkdirSync(new URL('../../tmp/pdfs/', import.meta.url), { recursive: true });
fs.writeFileSync(target, pdf);
console.log(target.pathname);
