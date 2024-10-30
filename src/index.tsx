/* @refresh reload */
import "./App.css";
import { lazy } from "solid-js";
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";

const routes = [
  {
    path: "/",
    component: lazy(() => import("./App")),
  },
  {
    path: "/dashboard",
    component: lazy(() => import("./dashboard/dashboard")),
  },
  {
    path: "/library/:folder",
    component: lazy(() => import("./routes/folder-library/library")),
  },
  {
    path: "/settings/:section",
    component: lazy(() => import("./routes/settings/settings")),
  },
  {
    path: "/create-profile",
    component: lazy(() => import("./profile/create-profile")),
  },
];

render(() => <Router>{routes}</Router>, document.getElementById("root") as HTMLElement);
