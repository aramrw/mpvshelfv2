import { invoke } from "@tauri-apps/api/core";
import { UserType } from "src/models";

const getDefaultUser = async (): Promise<UserType | null> => {
    try {
        const user: UserType = await invoke("get_default_user");
        return user; // Return the user
    } catch (error) {
        console.error("GetDefaultUser", error);
        return null; // Return null if there is an error
    }
};

export default getDefaultUser;
