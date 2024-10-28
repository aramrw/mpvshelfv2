/* @refresh reload */
import "./App.css";
import { lazy } from "solid-js";
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { ToastRegion, ToastList } from "./components/ui/toast"

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
    path: "/library/:folderPath",
    component: lazy(() => import("./routes/folder-library/library")),
  },
  {
    path: "/create-profile",
    component: lazy(() => import("./profile/create-profile")),
  },
];

render(() => <Router>{routes}</Router>, document.getElementById("root") as HTMLElement);
