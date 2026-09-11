// Relative by default: the API serves this SPA from its own wwwroot, so every
// call is same-origin. That keeps working on www / non-www alike and means CORS
// never applies in production. Override only for local dev, where CRA serves on
// :3000 and the API listens elsewhere.
const API_BASE_URL: string = process.env.REACT_APP_API_BASE_URL || "";

export default API_BASE_URL;
