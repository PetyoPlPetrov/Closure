/**
 * Sfera Event attendance – join/leave requests to Google Apps Script and device ID.
 * On success, the app stores attendance in AsyncStorage via sfera-events helpers.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "@sferas:device_id";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwfl_IY0dT1NuZD3Ltk9HHapdRvQxxdn-QQARWdkJ0ADW0ZsOBDEdIytMD17oYi1_TL/exec";
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable device identifier for join/leave requests.
 * Uses a stored UUID so it works on all platforms without extra native APIs.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.length < 10) {
      id = Platform.OS + "-" + generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown-" + generateUUID();
  }
}

export type EventAttendanceAction = "join" | "leave";

/**
 * Sends join or leave request to the Google Apps Script.
 * Returns true if the script responded with status "success".
 */
export async function updateEventStatus(
  eventId: string,
  action: EventAttendanceAction,
): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const body = { eventId, deviceId, action };
    console.log("[Sfera attendance] Leave event request", {
      url: SCRIPT_URL,
      method: "POST",
      body,
    });

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      status?: string;
      message?: string;
    };
    console.log("result event attendance", result);
    if (result.status === "success") {
      if (action === "leave") {
        console.log("[Sfera attendance] Leave event success", {
          eventId,
          result,
        });
      }
      return true;
    }
    if (result.message) {
      console.warn("[Sfera attendance]", result.message);
    }
    console.log("[Sfera attendance] Leave event non-success response", {
      eventId,
      result,
      status: response.status,
    });

    return false;
  } catch (error) {
    console.error("[Sfera attendance] Network error:", error);
    if (action === "leave") {
      console.log("[Sfera attendance] Leave event failed (thrown)", {
        eventId,
      });
    }
    return false;
  }
}
