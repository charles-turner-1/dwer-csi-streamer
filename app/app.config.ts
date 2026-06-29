// Nuxt UI theme: the app's accent has always been blue (the old PrimeVue Aura
// blue / Tailwind blue-600), so set `primary` to blue rather than Nuxt UI's
// default green. `neutral` keeps the grey palette used throughout the UI.
export default defineAppConfig({
  ui: {
    colors: {
      primary: "blue",
      neutral: "gray",
    },
  },
});
