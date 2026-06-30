// @vitest-environment nuxt
import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import DashboardLayout from "~/layouts/dashboard.vue";

const stubs = {
  UHeader: {
    template: "<header><slot /><slot name='right' /><slot name='body' /></header>",
  },
  UNavigationMenu: true,
  UDashboardGroup: { template: "<div><slot /></div>" },
  GitCommit: true,
};

describe("dashboard layout", () => {
  it("renders without crashing", async () => {
    const wrapper = await mountSuspended(DashboardLayout, {
      global: { stubs },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("passes default slot content through", async () => {
    const wrapper = await mountSuspended(DashboardLayout, {
      global: { stubs },
      slots: {
        default: '<div data-testid="slot-content">Hello</div>',
      },
    });
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="slot-content"]').text()).toBe("Hello");
  });
});
