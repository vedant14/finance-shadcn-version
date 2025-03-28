import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("./dashboard/layout.jsx", [
    index("routes/home.jsx"),
    route("/:teamId", "./routes/dashboardOutlet.jsx", [
      route("", "./routes/dashboard/index.jsx"),
      route("ledger", "./routes/dashboard/ledger.jsx"),
      route("sources", "./routes/team/sources.jsx"),
      route("categories", "./routes/team/categories.jsx"),
    ]),
  ]),
  route("login", "./routes/auth/login.jsx"),
  route("api/create-user", "./api/create-user.js"),
  route("api/fetch-token", "./api/fetch-token.js"),
  route("api/fetch-email/:sourceId", "./api/fetch-email.js"),
] satisfies RouteConfig;
