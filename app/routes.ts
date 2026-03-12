import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  route("/login", "login/Login.tsx"),

  layout("layouts/AuthLayout.tsx", [
    index("routes/home.tsx"),
    route("/laporan", "pages/laporan/LaporanTerpadu.tsx"),
    route("/edit", "pages/edit/EditLaporan.tsx"),
    route("/rekap-be", "pages/rekap-be/RekapBe.tsx"),
    route("/rekap-be/detail", "pages/rekap-be/RekapBeDetail.tsx"),
    route("/monitoring/:id", "pages/monitoring/MonitoringDetail.tsx"),
    route("/outlet", "pages/outlet/Outlet.tsx"),
    route("/item", "pages/item/Item.tsx"),
    route("/tagihan", "pages/tagihan/Tagihan.tsx"),
    route("/users", "pages/users/Users.tsx")
  ]),

] satisfies RouteConfig;
