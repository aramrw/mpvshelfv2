import { onMount } from "solid-js";
import "./App.css";
import Navbar from "./main-components/navbar";
//import { User } from "../@/libs/models";
import { useNavigate } from "@solidjs/router";
import getDefaultUser from "./tauri-cmds/get_default_user";

function App() {
  const navigate = useNavigate();

  onMount(async () => {
    getDefaultUser().then((user: unknown) => {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/create-profile")
      }
    })
  });

  return (
    <main>
      <Navbar />
      App
    </main>
  );
}

export default App;
