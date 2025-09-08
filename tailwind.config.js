/** @type {import('tailwindcss').Config} */
module.exports = {
  // A linha 'content' é a mais importante.
  // Esta configuração garante que o Tailwind leia TODOS os ficheiros .ejs na pasta views.
  content: [
    './views/**/*.ejs',
    './src/**/*.{js,css}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}