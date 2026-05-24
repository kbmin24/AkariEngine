import escapeHTML from './escapeHTML.js'

test('Escapes ampersand', () => {
  expect(escapeHTML('bread & butter')).toBe('bread &amp; butter');
})

test('Escapes double quotes', () => {
  expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
})

test('Escapes single quotes', () => {
  expect(escapeHTML("it's fine")).toBe('it&#039;s fine');
})

test('Escapes all special characters together', () => {
  expect(escapeHTML(`<a href="page" data-x='1'>AT&T</a>`))
    .toBe('&lt;a href=&quot;page&quot; data-x=&#039;1&#039;&gt;AT&amp;T&lt;/a&gt;');
})

test('Returns plain text unchanged', () => {
  expect(escapeHTML('hello world')).toBe('hello world');
})

test('Returns empty string unchanged', () => {
  expect(escapeHTML('')).toBe('');
})

test('Escapes example XSS attempt', () => {
  expect(escapeHTML('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
})
