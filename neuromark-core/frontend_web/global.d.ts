// Global types for Next.js CSS imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
