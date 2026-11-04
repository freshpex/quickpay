module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: { colors: { violet: "#6D28D9", deep: "#2E1065", paper: "#FAF9FF", lime: "#D9F86C", ink: "#191425", muted: "#71677E", line: "#E9E2F3", danger: "#B42318" } } },
  plugins: []
};
