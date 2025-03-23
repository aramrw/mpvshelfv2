import { onMount } from "solid-js";
import "./App.css";
import { useNavigate, usePreloadRoute } from "@solidjs/router";
import get_default_user from "./tauri-cmds/user/get_default_user";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const navigate = useNavigate();

  onMount(async () => {
    let defaultUser = await get_default_user();
    if (defaultUser) {
      navigate("/dashboard");
    } else {
      await invoke("create_default_user");
      navigate("/dashboard");
    }
  });

  return <></>;
}

export default App;
