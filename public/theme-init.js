try {
  const saved = localStorage.getItem("taskbox.appearance");
  document.documentElement.dataset.theme =
    saved === "dark" ||
    (!saved && matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
} catch {
  document.documentElement.dataset.theme = matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}
