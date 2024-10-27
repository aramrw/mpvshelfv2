import { onMount } from "solid-js";
import "./App.css";
import Navbar from "./main-components/navbar";
//import { User } from "../@/libs/models";
import { useNavigate } from "@solidjs/router";
import { get_default_user } from "./tauri-cmds/users";

function App() {
  const navigate = useNavigate();

  onMount(async () => {
    get_default_user().then((user: unknown) => {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/create-profile")
      }
    })
  });

  return (
    <main>
    </main>
  );
}

export default App;
