import { Probot } from "probot";

export = (app: Probot) => {
  app.on("issues.edited", async (context) => {
    const issueComment = context.issue({
      body: "Tak for edit. Du er sød.",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  app.on("release.created", async (context) => {
    /**
     * 1. List releases and find the latest release (lower semver)
     * 2. Find this release
     * 3. Do a compare to find all pull-requests merged in between
     * 4. Generate release draft
     * 5. Add to this release
     */

    //const latestRelease = await context.octokit.repos.getLatestRelease();
    //const releaseId = context.payload.release.id
    //const releaseOwner = context.payload.release.author
    //const releaseRepo = context.payload.repository
    context.log.info("debug", context.payload)

    //context.octokit.repos.getRelease(context.payload.release.id)
    return;
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
