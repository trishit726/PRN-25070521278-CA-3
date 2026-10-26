/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        labops: {
          base: "#0B1020",
          sidebar: "#10182A",
          card: "#151D31",
          border: "#263248",
          accent: "#6366F1",
        },
      },
    },
  },
  plugins: [],
};
