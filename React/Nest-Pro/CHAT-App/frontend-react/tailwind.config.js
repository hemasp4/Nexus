/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#6366f1',
                secondary: '#818cf8',
                accent: '#a5b4fc',
            },
        },
    },
    plugins: [],
}
