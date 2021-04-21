import { Probot } from "probot";
import compareVersions from "compare-versions";
import semver from "semver";

/**
 * TODO:
 * 1. Fetch all releases matching our major + minor and add their body to ours as
 * 2. Cleanup and split up
 */

const PAGE_BREAK_MD = "<!-- Page break -->";

export = (app: Probot) => {
  app.on("release", async (context) => {
    app.log.info("onRelease", context.payload, context.config);
    /**
     * 1. List releases and find the latest release (lower semver)
     * 2. Find this release
     * 3. Do a compare to find all pull-requests merged in between
     * 4. Generate release draft
     * 5. Add to this release
     */

    if (context.payload.release.body !== "") {
      context.log.warn("Body is not empty, ignoring event");
      return;
    }

    const thisVersion = context.payload.release.tag_name;
    if (!semver.valid(thisVersion)) {
      context.log.warn("Version in tag name is not valid, ignoring");
      return;
    }

    let releases = await context.octokit.paginate(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner: context.repo().owner,
        repo: context.repo().repo,
      }
    );

    let filteredReleases = releases
      .map((r) => ({
        name: r.name,
        tag_name: r.tag_name,
        draft: r.draft,
        prerelease: r.prerelease,
        body: r.body,
        url: r.html_url,
      }))
      .filter((r) => {
        // Exclude drafts and pre-releases from comparison
        if (r.draft || r.prerelease) {
          return false;
        }
        // Exclude any newer versions than our own
        if (
          compareVersions(r.tag_name, context.payload.release.tag_name) >= 0
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => compareVersions(b.tag_name, a.tag_name));

    if (filteredReleases.length === 0) {
      return; // No earlier releases, nothing to do.
    }
    const lastRelease = filteredReleases[0];

    const comparison = await context.octokit.repos.compareCommits({
      owner: context.repo().owner,
      repo: context.repo().repo,
      base: lastRelease.tag_name,
      head: context.payload.release.tag_name,
    });

    const commits = comparison.data.commits;

    let pullRequests: {
      [key: number]: {
        id: number;
        title: string;
        url: string;
        body: string | null;
        number: number;
        labels: {
          id?: number | undefined;
          node_id?: string | undefined;
          url?: string | undefined;
          name?: string | undefined;
          description?: string | undefined;
          color?: string | undefined;
          default?: boolean | undefined;
        }[];
        user: {
          login: string;
          id: number;
          node_id: string;
          avatar_url: string;
          gravatar_id: string | null;
          url: string;
          html_url: string;
          followers_url: string;
          following_url: string;
          gists_url: string;
          starred_at?: string | undefined;
        } | null;
      };
    } = {};

    let orphanedCommits = [];

    for (let i = 0; i < commits.length; i++) {
      let pr = await context.octokit.repos.listPullRequestsAssociatedWithCommit(
        {
          owner: context.repo().owner,
          repo: context.repo().repo,
          commit_sha: commits[i].sha,
        }
      );
      if (pr.data.length > 0) {
        pullRequests[pr.data[0].id] = pr.data[0];
      } else {
        orphanedCommits.push(commits[i]);
      }
    }

    // Add pull-requests to the body
    let newBody = ``;

    for (const k in pullRequests) {
      const user =
        (pullRequests[k].user?.login && `, @${pullRequests[k].user?.login}`) ||
        "";
      newBody += `- ${pullRequests[k].title} (#${pullRequests[k].number}${user})\n`;

      // Labels
      if (pullRequests[k].labels.length > 0) {
        let labels = "\t";
        pullRequests[k].labels.forEach((l) => {
          labels += `![${l.name}](https://img.shields.io/static/v1?message=${l.name}&color=${l.color}&label=) `;
        });
        labels += "\n";
        newBody += labels;
      }
    }

    if (orphanedCommits.length > 0) {
      let orphanedText = "";
      for (let i = 0; i < orphanedCommits.length; i++) {
        const c = orphanedCommits[i];
        orphanedText += `- **${c.commit.author?.name}**: [${c.commit.message}](${c.html_url})\n`;
      }
      newBody += `<details><summary>Direct Commits</summary>\n\n${orphanedText}\n</details>`;
      newBody += "\n";
    }

    // Add previous releases if they match the same major/minor version.
    filteredReleases = filteredReleases.filter((r) => {
      const rMajor = semver.major(r.tag_name);
      const rMinor = semver.minor(r.tag_name);
      const tMajor = semver.major(thisVersion);
      const tMinor = semver.minor(thisVersion);
      if (tMajor === rMajor && tMinor == rMinor) {
        return true;
      }
      return false;
    });

    if (filteredReleases.length > 0) {
      newBody += "\n" + PAGE_BREAK_MD + "\n";
      newBody += `## Previous releases\n\n`;
      for (let i = 0; i < filteredReleases.length; i++) {
        const body = filteredReleases[i].body;
        newBody += `### [${filteredReleases[i].name}](${filteredReleases[i].url})\n\n`;
        if (!body) {
          continue;
        }

        const bodyPart =
          (filteredReleases[i].body &&
            filteredReleases[i].body?.split(PAGE_BREAK_MD)[0]) ||
          "";
        if (bodyPart) {
          newBody += `${bodyPart}\n\n`;
        } else {
          newBody += `${filteredReleases[i].body}\n\n`;
        }
      }
    }

    await context.octokit.repos.updateRelease({
      owner: context.repo().owner,
      repo: context.repo().repo,
      release_id: context.payload.release.id,
      body: newBody,
    });
  });
};
