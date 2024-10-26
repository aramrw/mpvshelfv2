import { createSignal, onMount, Suspense } from "solid-js";
import NavBar from "../main-components/navbar"
import { UserType } from "src/models";
import getDefaultUser from "../tauri-cmds/get_default_user";
import AddNewSkeleton from "./components/add-new-skeleton";

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [folders, setFolders] = createSignal();

  onMount(() => {
    getDefaultUser().then((user: unknown) => {
      setUser(user as UserType);
      console.log(user);
    })
  });

  return (
    <main>
      <NavBar />
      <section class="p-3">
        {user && (
          <AddNewSkeleton user={user()} />
        )}
      </section>
    </main>
  );
}
