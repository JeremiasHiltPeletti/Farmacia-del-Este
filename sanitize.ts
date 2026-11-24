import DOMPurify from 'dompurify';

// Solo el formato que genera el editor de texto enriquecido (RichTextEditor).
// Sin atributos: así no pasan manejadores (onerror, onclick...), estilos ni enlaces.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div', 'span'];

export const sanitizeRichText = (html: string | undefined | null): string =>
  html ? DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] }) : '';
