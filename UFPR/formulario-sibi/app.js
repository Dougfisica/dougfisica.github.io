const form = document.querySelector('#sibi-form');
const statusNode = document.querySelector('#status');
const button = document.querySelector('#generate');
const fieldNames = ['docente', 'email', 'curso', 'biblioteca', 'quantidade'];
const backgroundImage = document.querySelector('#form-background');
backgroundImage.src = window.SIBI_BACKGROUND;

for (const name of fieldNames) {
  const input = form.elements[name];
  const output = document.querySelector(`[data-preview="${name}"]`);
  input.addEventListener('input', () => { output.textContent = input.value; });
}

const concatBytes = (...parts) => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};

const ascii = value => new TextEncoder().encode(value);

function dataUrlBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function winAnsiByte(char) {
  const code = char.codePointAt(0);
  if (code <= 255) return code;
  const special = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  return special[char] ?? 63;
}

function pdfText(value) {
  let result = '(';
  for (const char of value) {
    const byte = winAnsiByte(char);
    if (byte === 40 || byte === 41 || byte === 92) result += `\\${String.fromCharCode(byte)}`;
    else if (byte < 32 || byte > 126) result += `\\${byte.toString(8).padStart(3, '0')}`;
    else result += String.fromCharCode(byte);
  }
  return result + ')';
}

function wrapText(text, maxWidth, fontSize, maxLines = 2) {
  const average = fontSize * 0.52;
  const maxChars = Math.max(8, Math.floor(maxWidth / average));
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) line = next;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join(' ').length;
  if (consumed < String(text).trim().length && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
  }
  return lines;
}

function fitSingleLine(text, maxWidth, preferred = 10.5) {
  const estimated = Math.max(1, String(text).length) * preferred * 0.52;
  return Math.max(7, Math.min(preferred, preferred * maxWidth / estimated));
}

function addTextCommands(values) {
  const scaleX = 595.28 / 1240;
  const scaleY = 841.89 / 1754;
  const x = 374 * scaleX;
  const maxWidth = 690 * scaleX;
  const specs = [
    ['docente', 584, 10.5, 1],
    ['email', 659, 10.5, 1],
    ['curso', 734, 10.5, 2],
    ['biblioteca', 818, 10.5, 2],
    ['quantidade', 908, 10.5, 1]
  ];
  const commands = ['q', '595.28 0 0 841.89 0 0 cm', '/Im1 Do', 'Q', '0 g'];
  for (const [name, pixelY, preferred, maxLines] of specs) {
    const value = String(values[name] ?? '').trim();
    if (!value) continue;
    const size = maxLines === 1 ? fitSingleLine(value, maxWidth, preferred) : preferred;
    const lines = maxLines === 1 ? [value] : wrapText(value, maxWidth, size, maxLines);
    lines.forEach((line, index) => {
      const y = 841.89 - (pixelY + index * 25) * scaleY;
      commands.push(`BT /F1 ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfText(line)} Tj ET`);
    });
  }
  return commands.join('\n') + '\n';
}

function makePdf(jpegBytes, values) {
  const content = ascii(addTextCommands(values));
  const objects = [
    ascii('<< /Type /Catalog /Pages 2 0 R >>'),
    ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 4 0 R >>'),
    concatBytes(ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii('endstream')),
    ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    concatBytes(ascii(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`), jpegBytes, ascii('\nendstream'))
  ];

  const chunks = [concatBytes(ascii('%PDF-1.4\n%'), new Uint8Array([255, 255, 255, 255]), ascii('\n'))];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const wrapped = concatBytes(ascii(`${index + 1} 0 obj\n`), object, ascii('\nendobj\n'));
    chunks.push(wrapped);
    length += wrapped.length;
  });
  const xrefOffset = length;
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let i = 1; i <= objects.length; i++) xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  xref.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(ascii(xref.join('\n')));
  return concatBytes(...chunks);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  button.disabled = true;
  statusNode.textContent = 'Gerando o documento…';
  try {
    const jpeg = dataUrlBytes(window.SIBI_BACKGROUND);
    const values = Object.fromEntries(fieldNames.map(name => [name, form.elements[name].value]));
    const pdf = makePdf(jpeg, values);
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    const safeName = values.docente.trim().replace(/[^a-z0-9à-ÿ]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'preenchida';
    link.href = url;
    link.download = `ficha-sibi-${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    statusNode.textContent = 'PDF gerado e baixado com sucesso.';
  } catch (error) {
    console.error(error);
    statusNode.textContent = 'Não foi possível gerar o PDF. Recarregue a página e tente novamente.';
  } finally {
    button.disabled = false;
  }
});
