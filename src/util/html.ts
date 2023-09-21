/** A naive templating function that replaces placeholders in a string with provided values. */
export const renderTemplate = (template: string, values: Record<string, string>) => {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }
  return rendered;
};
