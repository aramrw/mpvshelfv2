import { invoke } from "@tauri-apps/api/core";
import { UserType } from "src/models";

const getGlobalUser = async (): Promise<UserType | null> => {
    try {
        const user: UserType = await invoke("get_global_user");
        return user; 
    } catch (error) {
        console.error("getGlobalUser", error);
        return null; 
    }
};

export default getGlobalUser;
