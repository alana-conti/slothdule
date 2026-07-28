import { describe, expect, it } from "vitest";

import {
  mascotNotifications,
  pickMascotNotification,
} from "./mascot-notifications";

describe("pickMascotNotification", () => {
  it("offers a varied collection of calm messages", () => {
    expect(mascotNotifications.length).toBeGreaterThanOrEqual(10);
    expect(new Set(mascotNotifications.map((message) => message.body)).size).toBe(
      mascotNotifications.length,
    );
  });

  it("can select the first and last messages deterministically", () => {
    expect(pickMascotNotification(() => 0)).toEqual(mascotNotifications[0]);
    expect(pickMascotNotification(() => 0.999999)).toEqual(
      mascotNotifications[mascotNotifications.length - 1],
    );
  });
});
