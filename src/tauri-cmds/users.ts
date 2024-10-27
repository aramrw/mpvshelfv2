import { invoke } from "@tauri-apps/api/core";
import { UserType } from "src/models";

const get_default_user = async (): Promise<UserType | null> => {
  try {
    const user: UserType = await invoke("get_default_user");
    return user;
  } catch (error) {
    console.error("get_default_user", error);
    return null;
  }
};

export { get_default_user };
