// Cron Worker: fires once a day and triggers the star refresh on the
// Pages site. Pages Functions have no native cron trigger, so this tiny
// Worker is the scheduler; the actual refresh runs inside the Pages
// Function (POST /api/cron/refresh-stars), authenticated by CRON_SECRET.
//
// Deploy: `wrangler deploy` from this directory (see ../README.md).
// Secrets: CRON_SECRET must be set on BOTH this Worker and the Pages
// project, to the same value.

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const url = `${env.SITE_URL.replace(/\/$/, "")}/api/cron/refresh-stars`;
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "x-cron-auth": env.CRON_SECRET },
          });
          console.log(
            `star refresh ${controller.cron}: ${res.status} ${await res.text()}`,
          );
        } catch (err) {
          console.log(`star refresh ${controller.cron} failed: ${err}`);
        }
      })(),
    );
  },
};
