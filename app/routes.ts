import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  route("/login", "login/Login.tsx"),
  
  layout("layouts/AuthLayout.tsx", [
    index("routes/home.tsx")
  ]),
  
] satisfies RouteConfig;
